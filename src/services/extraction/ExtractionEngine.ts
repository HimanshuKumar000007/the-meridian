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

    // Early-exit gate: gated/blocked source confirmed — dead-letter immediately without NVIDIA call.
    // This fires when the source returned fetchStatus='blocked' (e.g. RSS ends with "Read more"
    // sentinel AND enrichment fetch returned blocked/JS-gated/non-enriching content).
    // Saves the full NVIDIA 35s budget per item and frees the orchestrator window for valid items.
    if (acquired.fetchStatus === 'blocked') {
      const errorMsg = `[ExtractionEngine] Source is gated/blocked for item ${item.id}: ${acquired.error || 'CONTENT_GATED'}`;
      const now = new Date().toISOString();
      const candidateId = `ext-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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

      // Gated sources dead-letter immediately — no retries, they will never succeed
      const failedRecord: NewsExtractionRecord = {
        id: candidateId,
        discovery_item_id: item.id,
        status: 'failed',
        model: 'unknown',
        prompt_version: promptVersion,
        input_hash: inputHash,
        error_code: DEAD_LETTER_ERROR_CODE,
        error_message: errorMsg,
        conflict_details: JSON.stringify({
          attempts: previousAttempts + 1,
          deadLettered: true,
          lastAttemptAt: now,
          lastError: acquired.error || 'CONTENT_GATED',
        }),
        created_at: now,
        updated_at: now,
      };

      if (!options.dryRun && this.repository) {
        await this.repository.saveExtraction(failedRecord);
        await this.repository.updateDiscoveryItemStatus(item.id, 'failed');
      }

      throw new Error(errorMsg);
    }


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

      // Parse JSON — with truncation-aware recovery
      let parsedObj: any;
      try {
        parsedObj = JSON.parse(rawJson);
      } catch (parseErr: any) {
        const isTruncated = parseErr.message?.includes('Unexpected end') ||
          parseErr.message?.includes('Unterminated') ||
          parseErr.message?.includes('end of JSON');

        if (isTruncated) {
          // Stage 1: Structural repair — close unclosed brackets/braces/strings.
          // Handles the common case where max_tokens cut the response mid-object.
          const repaired = this.repairTruncatedJson(rawJson);
          let repairSucceeded = false;
          if (repaired) {
            try {
              parsedObj = JSON.parse(repaired);
              repairSucceeded = true;
            } catch {
              // Structural repair also failed — proceed to Stage 2
            }
          }

          if (!repairSucceeded) {
            // Stage 2: Retry with reduced max_tokens + brevity instruction.
            // A second full-size request would also be truncated — ask for shorter output.
            const brevityRetry = await this.llmProvider.extractStructuredNews(
              systemPrompt,
              `Your previous response was truncated mid-JSON (hit token limit). ` +
              `Produce a SHORTER but COMPLETE and valid JSON response. ` +
              `Keep contentBlocks to 4-6 paragraphs maximum. Keep summary under 3 sentences. ` +
              `Ensure all arrays and objects are properly closed. ` +
              `Source:\n\n${userPrompt}`,
              options.model,
              1200
            );
            parsedObj = JSON.parse(brevityRetry.rawJson);
          }
        } else {
          // Non-truncation parse error — standard correction retry
          const retryCorrection = await this.llmProvider.extractStructuredNews(
            systemPrompt,
            `The previous response was malformed JSON: ${parseErr.message}. Output ONLY valid JSON matching the schema for the following source:\n\n${userPrompt}`,
            options.model
          );
          parsedObj = JSON.parse(retryCorrection.rawJson);
        }
      }


      // Normalize enum fields before schema validation (case-insensitivity, whitespace)
      if (parsedObj && typeof parsedObj === 'object') {
        if (typeof parsedObj.category === 'string') {
          const cat = parsedObj.category.toLowerCase().trim();
          if (
            cat === 'ai' ||
            cat.includes('artificial intelligence') ||
            cat.includes('machine learning') ||
            cat.includes('deep learning') ||
            cat.includes('genai') ||
            cat.includes('large language model') ||
            cat.includes('frontier ai') ||
            cat.includes('neural')
          ) {
            parsedObj.category = 'ai';
          } else if (cat.includes('gaming') || cat.includes('videogame') || cat.includes('esport')) {
            parsedObj.category = 'gaming';
          } else if (cat.includes('space') || cat.includes('astronomy') || cat.includes('aerospace')) {
            parsedObj.category = 'space';
          } else if (cat.includes('cyber') || cat.includes('infosec') || cat.includes('security')) {
            parsedObj.category = 'cybersecurity';
          } else if (cat.includes('science') || cat.includes('biology') || cat.includes('physics')) {
            parsedObj.category = 'science';
          } else if (cat.includes('business') || cat.includes('finance') || cat.includes('market') || cat.includes('economy')) {
            parsedObj.category = 'business';
          } else if (cat.includes('hardware') || cat.includes('chip') || cat.includes('semiconductor')) {
            parsedObj.category = 'hardware';
          } else if (cat.includes('software') || cat.includes('app') || cat.includes('application')) {
            parsedObj.category = 'apps';
          } else if (cat.includes('entertainment') || cat.includes('media') || cat.includes('film')) {
            parsedObj.category = 'entertainment';
          } else if (cat.includes('world') || cat.includes('politics') || cat.includes('diplomacy')) {
            parsedObj.category = 'world';
          } else if (cat.includes('tech')) {
            parsedObj.category = 'technology';
          } else if (item.categoryHint && ['ai', 'technology', 'gaming', 'science', 'space', 'business', 'world', 'entertainment', 'cybersecurity', 'apps', 'hardware'].includes(item.categoryHint)) {
            parsedObj.category = item.categoryHint;
          }
        } else if (!parsedObj.category && item.categoryHint) {
          parsedObj.category = item.categoryHint;
        }
        if (typeof parsedObj.status === 'string') {
          parsedObj.status = parsedObj.status.toLowerCase().trim();
        }
        if (typeof parsedObj.confidenceLevel === 'string') {
          parsedObj.confidenceLevel = parsedObj.confidenceLevel.toLowerCase().trim();
        }
        if (Array.isArray(parsedObj.entities)) {
          /**
           * Entity type normalization map.
           * Maps values the LLM commonly returns that are NOT in the enum
           * to the closest valid EntityTypeEnum member.
           * Unknown types that cannot be mapped are dropped from the array
           * rather than failing the entire extraction with a schema error.
           */
          const ENTITY_TYPE_MAP: Record<string, string> = {
            // Direct enum values (lowercase passthrough)
            person: 'person',
            company: 'company',
            organization: 'organization',
            organisation: 'organization',
            org: 'organization',
            product: 'product',
            game: 'game',
            videogame: 'game',
            'video game': 'game',
            technology: 'technology',
            tech: 'technology',
            software: 'technology',
            hardware: 'technology',
            platform: 'technology',
            framework: 'technology',
            location: 'location',
            place: 'location',
            country: 'location',
            city: 'location',
            region: 'location',
            nation: 'location',
            state: 'location',
            event: 'event',
            conference: 'event',
            festival: 'event',
            tournament: 'event',
            // Common LLM over-generations mapped to nearest enum member
            brand: 'company',
            studio: 'company',
            developer: 'company',
            publisher: 'company',
            institution: 'organization',
            agency: 'organization',
            government: 'organization',
            ngo: 'organization',
            university: 'organization',
            standard: 'product',
            model: 'product',
            service: 'product',
            app: 'product',
            application: 'product',
            device: 'product',
            franchise: 'game',
            series: 'game',
            title: 'game',
          };

          parsedObj.entities = parsedObj.entities
            .filter((ent: any) => ent && typeof ent === 'object' && ent.name)
            .map((ent: any) => {
              if (typeof ent.type === 'string') {
                const normalized = ent.type.toLowerCase().trim().replace(/[_\-]/g, ' ');
                const mapped = ENTITY_TYPE_MAP[normalized];
                return mapped ? { ...ent, type: mapped } : null;
              }
              return null;
            })
            .filter(Boolean);
        }

        if (Array.isArray(parsedObj.facts)) {
          parsedObj.facts = parsedObj.facts
            .filter((f: any) => f && typeof f === 'object' && f.label)
            .map((f: any) => ({
              ...f,
              label: String(f.label).trim(),
              value: f.value !== null && f.value !== undefined ? String(f.value).trim() : 'N/A',
            }))
            .filter((f: any) => f.value.length > 0);
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

  /**
   * Attempts to structurally repair a JSON string truncated mid-output (e.g. by max_tokens).
   * Closes unclosed strings, arrays, and objects in order so JSON.parse() can succeed.
   * Returns null if the input cannot be repaired (e.g. doesn't start with '{').
   *
   * This is a best-effort repair — it may produce semantically incomplete but structurally
   * valid JSON. The schema validation step downstream will catch any missing required fields.
   */
  private repairTruncatedJson(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('{')) return null;

    try {
      // Track nesting stack to know what needs closing
      const stack: Array<'{' | '[' | '"'> = [];
      let inString = false;
      let escaped = false;

      for (let i = 0; i < trimmed.length; i++) {
        const ch = trimmed[i];

        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\' && inString) {
          escaped = true;
          continue;
        }
        if (ch === '"') {
          if (inString) {
            // Close the string
            stack.pop();
            inString = false;
          } else {
            stack.push('"');
            inString = true;
          }
          continue;
        }
        if (inString) continue; // ignore everything inside a string

        if (ch === '{') { stack.push('{'); continue; }
        if (ch === '[') { stack.push('['); continue; }
        if (ch === '}') { stack.pop(); continue; }
        if (ch === ']') { stack.pop(); continue; }
      }

      // Build the closing sequence from the stack (innermost first)
      let repaired = trimmed;

      // If we're mid-string, close it with a safe sentinel value
      if (inString) {
        repaired += '"';
        stack.pop(); // remove the open string marker
      }

      // Close remaining open structures
      for (let i = stack.length - 1; i >= 0; i--) {
        const open = stack[i];
        if (open === '{') repaired += '}';
        else if (open === '[') repaired += ']';
        // open string markers should have been handled above
      }

      return repaired;
    } catch {
      return null;
    }
  }
}
