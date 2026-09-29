/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from 'crypto';
import type { DiscoveryItem } from '../../types/discovery';
import type {
  ExtractedNewsCandidate,
  NewsExtractionRecord,
  ExtractionOptions,
} from '../../types/extraction';
import { SourceContentAcquisitionService } from './SourceContentAcquisitionService';
import { ExtractedPayloadSchema, type ExtractedPayload } from './ExtractionSchema';
import {
  CURRENT_PROMPT_VERSION,
  buildSystemPrompt,
  buildUserPrompt,
  type PromptInput,
} from './extractionPrompt';
import type { ExtractionLLMProvider } from './NvidiaClient';
import type { ExtractionRepository } from '../../data/repositories/ExtractionRepository';
import {
  parseExtractionRetryInfo,
  getMaxExtractionRetries,
  DEAD_LETTER_ERROR_CODE,
} from '../../config/extractionRetryPolicy';

export interface ExtractionEngineOptions {
  llmProvider: ExtractionLLMProvider;
  repository?: ExtractionRepository;
  acquisitionService?: SourceContentAcquisitionService;
}

/**
 * Universal News Extraction Engine Pipeline Orchestrator.
 */
export class ExtractionEngine {
  private llmProvider: ExtractionLLMProvider;
  private repository?: ExtractionRepository;
  private acquisitionService: SourceContentAcquisitionService;

  constructor(options: ExtractionEngineOptions) {
    this.llmProvider = options.llmProvider;
    this.repository = options.repository;
    this.acquisitionService = options.acquisitionService || new SourceContentAcquisitionService();
  }

  /**
   * Computes a deterministic SHA-256 hash of the extraction input for idempotency.
   */
  public generateInputHash(item: DiscoveryItem, articleText: string): string {
    const inputPayload = `${item.id}|${item.canonicalUrl}|${articleText}|${item.publishedAt || ''}`;
    return createHash('sha256').update(inputPayload, 'utf8').digest('hex');
  }

  /**
   * Computes a deterministic SHA-256 hash of the normalized output.
   */
  public generateOutputHash(payload: ExtractedPayload): string {
    const normalized = JSON.stringify({
      title: payload.title,
      summary: payload.summary,
      category: payload.category,
      subcategory: payload.subcategory,
      facts: payload.facts,
      entities: payload.entities,
    });
    return createHash('sha256').update(normalized, 'utf8').digest('hex');
  }

  /**
   * Process a discovery item through the full extraction pipeline.
   */
  public async extract(
    item: DiscoveryItem,
    options: ExtractionOptions = {}
  ): Promise<ExtractedNewsCandidate> {
    const promptVersion = options.promptVersion || CURRENT_PROMPT_VERSION;

    // 1. Content Acquisition & Cleaning
    const acquired = await this.acquisitionService.acquireContent(item);
    const inputHash = this.generateInputHash(item, acquired.articleText);

    // 2. Idempotency Check: Check if already extracted
    if (!options.forceRerun && this.repository) {
      const existing = await this.repository.findExtraction(item.id, inputHash, promptVersion);
      if (existing && existing.status === 'completed') {
        return this.mapRecordToCandidate(existing, item);
      }
    }

    // 3. Build Prompts
    const promptInput: PromptInput = {
      title: acquired.title || item.title,
      sourceName: item.sourceName,
      sourceUrl: item.canonicalUrl || item.sourceUrl,
      categoryHint: item.categoryHint,
      subcategoryHint: item.subcategoryHint,
      publishedAt: acquired.publishedDate || item.publishedAt,
      articleText: acquired.articleText,
    };

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(promptInput);

    let rawJson = '';
    let usedModel = options.model || 'unknown';
    let validatedPayload: ExtractedPayload | null = null;
    let extractionError: string | null = null;
    let errorCode: string | null = null;

    // 4. Execute LLM Extraction with retry on malformed JSON
    try {
      const llmResult = await this.llmProvider.extractStructuredNews(
        systemPrompt,
        userPrompt,
        options.model
      );
      rawJson = llmResult.rawJson;
      usedModel = llmResult.model;

      // Parse JSON
      let parsedObj: any;
      try {
        parsedObj = JSON.parse(rawJson);
      } catch (parseErr: any) {
        // Attempt correction retry
        const retryCorrection = await this.llmProvider.extractStructuredNews(
          systemPrompt,
          `The previous response was malformed JSON: ${parseErr.message}. Output ONLY valid JSON matching the schema for the following source:\n\n${userPrompt}`,
          options.model
        );
        parsedObj = JSON.parse(retryCorrection.rawJson);
      }

      // Normalize enum fields before schema validation (case-insensitivity, whitespace)
      if (parsedObj && typeof parsedObj === 'object') {
        if (typeof parsedObj.category === 'string') {
          parsedObj.category = parsedObj.category.toLowerCase().trim();
          if (parsedObj.category === 'artificial intelligence' || parsedObj.category === 'genai') {
            parsedObj.category = 'ai';
          }
        }
        if (typeof parsedObj.status === 'string') {
          parsedObj.status = parsedObj.status.toLowerCase().trim();
        }
        if (typeof parsedObj.confidenceLevel === 'string') {
          parsedObj.confidenceLevel = parsedObj.confidenceLevel.toLowerCase().trim();
        }
        if (Array.isArray(parsedObj.entities)) {
          for (const ent of parsedObj.entities) {
            if (ent && typeof ent.type === 'string') {
              ent.type = ent.type.toLowerCase().trim();
            }
          }
        }
      }

      // Schema Validation via Zod
      const parseResult = ExtractedPayloadSchema.safeParse(parsedObj);
      if (!parseResult.success) {
        errorCode = 'SCHEMA_VALIDATION_ERROR';
        extractionError = `Schema validation failed: ${parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`;
      } else {
        validatedPayload = parseResult.data;
      }
    } catch (err: any) {
      errorCode = err.name === 'AbortError' ? 'EXTRACTION_TIMEOUT' : 'LLM_INFERENCE_ERROR';
      extractionError = err.message || 'LLM extraction failed';
    }

    const now = new Date().toISOString();
    const candidateId = `ext-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // 5. Build Final Candidate / Failed Record
    if (!validatedPayload) {
      let previousAttempts = 0;
      if (this.repository) {
        try {
          const existing = await this.repository.findExtraction(item.id, inputHash, promptVersion);
          if (existing) {
            const info = parseExtractionRetryInfo(existing.conflict_details, existing.error_code);
            previousAttempts = info.attempts;
          }
        } catch {}
      }

      const attemptCount = previousAttempts + 1;
      const maxRetries = options.maxRetries ?? getMaxExtractionRetries();
      const isDeadLetter = attemptCount >= maxRetries;
      const finalErrorCode = isDeadLetter ? DEAD_LETTER_ERROR_CODE : errorCode;

      const failedRecord: NewsExtractionRecord = {
        id: candidateId,
        discovery_item_id: item.id,
        status: 'failed',
        model: usedModel,
        prompt_version: promptVersion,
        input_hash: inputHash,
        error_code: finalErrorCode,
        error_message: extractionError,
        conflict_details: JSON.stringify({
          attempts: attemptCount,
          deadLettered: isDeadLetter,
          lastAttemptAt: now,
          lastError: extractionError,
        }),
        created_at: now,
        updated_at: now,
      };

      if (!options.dryRun && this.repository) {
        await this.repository.saveExtraction(failedRecord);
        if (isDeadLetter) {
          await this.repository.updateDiscoveryItemStatus(item.id, 'failed');
        }
      }

      throw new Error(`[ExtractionEngine] Extraction failed for item ${item.id}: ${extractionError}`);
    }

    // Determine final status based on confidence and conflict signals
    let extractionStatus: 'completed' | 'needs_review' = 'completed';
    if (validatedPayload.hasConflicts || validatedPayload.overallConfidence < 0.65) {
      extractionStatus = 'needs_review';
    }

    const outputHash = this.generateOutputHash(validatedPayload);

    const candidate: ExtractedNewsCandidate = {
      id: candidateId,
      discoveryItemId: item.id,

      title: validatedPayload.title,
      dek: validatedPayload.dek,
      summary: validatedPayload.summary,
      summaryPoints: validatedPayload.summaryPoints,

      category: validatedPayload.category,
      subcategory: validatedPayload.subcategory,
      classificationConfidence: validatedPayload.classificationConfidence,
      topics: validatedPayload.topics,

      status: validatedPayload.status,
      publishedAt: acquired.publishedDate || item.publishedAt,
      eventDate: validatedPayload.eventDate || undefined,
      author: validatedPayload.author || acquired.author || item.author,

      entities: validatedPayload.entities,
      facts: validatedPayload.facts,
      timelineCandidates: validatedPayload.timelineCandidates,

      contentBlocks: validatedPayload.contentBlocks as any,

      sources: [{ name: item.sourceName, url: item.canonicalUrl || item.sourceUrl }],
      heroImage: validatedPayload.heroImage || acquired.heroImage || item.imageUrl || null,
      sourceEvidence: validatedPayload.sourceEvidence,

      overallConfidence: validatedPayload.overallConfidence,
      confidenceLevel: validatedPayload.confidenceLevel,
      hasConflicts: validatedPayload.hasConflicts,
      conflictDetails: validatedPayload.conflictDetails,

      extractionStatus,
      model: usedModel,
      promptVersion,
      inputHash,
      outputHash,

      createdAt: now,
      updatedAt: now,
    };

    // 6. Persist to Database if Repository provided and not dry run
    if (!options.dryRun && this.repository) {
      const record = this.mapCandidateToRecord(candidate);
      await this.repository.saveExtraction(record);
      await this.repository.updateDiscoveryItemStatus(item.id, 'processed');
    }

    return candidate;
  }

  public mapCandidateToRecord(c: ExtractedNewsCandidate): NewsExtractionRecord {
    return {
      id: c.id,
      discovery_item_id: c.discoveryItemId,
      status: c.extractionStatus,
      model: c.model,
      prompt_version: c.promptVersion,
      input_hash: c.inputHash,
      output_hash: c.outputHash,

      title: c.title,
      dek: c.dek,
      summary: c.summary,
      summary_points: c.summaryPoints,

      category: c.category,
      subcategory: c.subcategory,
      classification_confidence: c.classificationConfidence,

      content: c.contentBlocks,
      facts: c.facts,
      entities: c.entities,
      timeline_candidates: c.timelineCandidates,
      source_evidence: c.sourceEvidence,

      overall_confidence: c.overallConfidence,
      has_conflicts: c.hasConflicts,
      conflict_details: c.conflictDetails,

      created_at: c.createdAt,
      updated_at: c.updatedAt,
    };
  }

  public mapRecordToCandidate(r: NewsExtractionRecord, item: DiscoveryItem): ExtractedNewsCandidate {
    return {
      id: r.id,
      discoveryItemId: r.discovery_item_id,
      title: r.title || item.title,
      dek: r.dek || '',
      summary: r.summary || item.description || '',
      summaryPoints: r.summary_points || [],

      category: r.category || item.categoryHint || 'technology',
      subcategory: r.subcategory || item.subcategoryHint || 'general',
      classificationConfidence: r.classification_confidence ?? 0.9,
      topics: [],

      status: 'normal',
      publishedAt: item.publishedAt,
      author: item.author,

      entities: r.entities || [],
      facts: r.facts || [],
      timelineCandidates: r.timeline_candidates || [],
      contentBlocks: r.content || [],

      sources: [{ name: item.sourceName, url: item.canonicalUrl || item.sourceUrl }],
      heroImage: item.imageUrl,
      sourceEvidence: r.source_evidence || [],

      overallConfidence: r.overall_confidence ?? 0.9,
      confidenceLevel: (r.has_conflicts ? 'conflicted' : 'high') as any,
      hasConflicts: Boolean(r.has_conflicts),
      conflictDetails: r.conflict_details,

      extractionStatus: r.status,
      model: r.model,
      promptVersion: r.prompt_version,
      inputHash: r.input_hash,
      outputHash: r.output_hash || '',

      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}
