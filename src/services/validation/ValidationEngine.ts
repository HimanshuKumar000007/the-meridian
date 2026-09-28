/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from 'crypto';
import type {
  NewsValidationResult,
  ValidationIssue,
  ValidationStatus,
  FieldStatus,
} from '../../types/validation';
import type {
  ExtractedNewsCandidate,
  NewsExtractionRecord,
  ExtractedFact,
  ExtractedEntity,
} from '../../types/extraction';
import {
  validateSourceUrl,
  validateCategoryHeuristic,
  validateTemporal,
  validateNumbers,
  validateQuotes,
  validateEntities,
  detectSensitiveTopics,
  checkOriginality,
  checkSourceSufficiency,
  countArticleBodyWords,
  detectFillerText,
  MIN_ARTICLE_BODY_WORDS,
} from './deterministicValidators';
import type { ValidationRepository } from '../../data/repositories/ValidationRepository';
import { PublicationGateService } from '../publishing/PublicationGateService';

export const CURRENT_VALIDATOR_VERSION = 'v1.0.0-independent-quality-gate';

export interface ValidationInput {
  extraction: ExtractedNewsCandidate | NewsExtractionRecord;
  sourceText: string;
  sourceUrl?: string;
  discoveryTitle?: string;
  publishedAt?: string | null;
  enforceArticleLength?: boolean;
}

export interface ValidationEngineOptions {
  repository?: ValidationRepository;
  validatorVersion?: string;
  enforceArticleLength?: boolean;
}

/**
 * Universal Independent News Fact Validation & Quality Gate Engine.
 * Answers: "Is this extracted news candidate actually supported by the source material?"
 * 
 * STRICT ARCHITECTURAL INVARIANT:
 * This engine NEVER creates or publishes stories into the public 'stories' table.
 */
export class ValidationEngine {
  private repository?: ValidationRepository;
  private validatorVersion: string;
  private enforceArticleLength: boolean;

  constructor(options: ValidationEngineOptions = {}) {
    this.repository = options.repository;
    this.validatorVersion = options.validatorVersion || CURRENT_VALIDATOR_VERSION;
    this.enforceArticleLength = options.enforceArticleLength ?? false;
  }

  /**
   * Computes a deterministic SHA-256 hash of the validation input for idempotency.
   */
  public generateInputHash(extractionId: string, outputHash: string, sourceText: string): string {
    const raw = `${extractionId}|${outputHash}|${sourceText}`;
    return createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  /**
   * Executes full fact validation on an extracted candidate against source text.
   */
  public async validate(
    input: ValidationInput,
    options: { dryRun?: boolean; forceRerun?: boolean; enforceArticleLength?: boolean } = {}
  ): Promise<NewsValidationResult> {
    const { extraction, sourceText } = input;
    const enforceLength =
      options.enforceArticleLength ?? input.enforceArticleLength ?? this.enforceArticleLength ?? false;
    const now = new Date().toISOString();

    // Normalize extraction fields
    const extractionId = extraction.id;
    const title = extraction.title || '';
    const summary = extraction.summary || '';
    const summaryPoints = ('summaryPoints' in extraction ? extraction.summaryPoints : extraction.summary_points) || [];
    const category = extraction.category || 'world';
    const facts: ExtractedFact[] = ('facts' in extraction ? extraction.facts : extraction.facts) || [];
    const entities: ExtractedEntity[] = ('entities' in extraction ? extraction.entities : extraction.entities) || [];
    const contentBlocks = ('contentBlocks' in extraction ? extraction.contentBlocks : extraction.content) || [];
    const outputHash = ('outputHash' in extraction ? extraction.outputHash : extraction.output_hash) || 'none';
    const sourceUrl = input.sourceUrl || (('sources' in extraction && extraction.sources?.[0]?.url) ? extraction.sources[0].url : '');
    const publishedAt = input.publishedAt || ('publishedAt' in extraction ? extraction.publishedAt : null);
    const eventDate = ('eventDate' in extraction ? extraction.eventDate : null);

    const inputHash = this.generateInputHash(extractionId, outputHash, sourceText);

    // 1. Idempotency Check
    if (!options.forceRerun && this.repository) {
      const existing = await this.repository.findValidation(extractionId, inputHash, this.validatorVersion);
      if (existing) {
        return existing;
      }
    }

    const issues: ValidationIssue[] = [];
    const validatedFields: Record<string, FieldStatus> = {
      title: 'validated',
      summary: 'validated',
      category: 'validated',
      facts: 'validated',
      entities: 'validated',
      quotes: 'validated',
    };
    const rejectedFields: string[] = [];

    // 2. Source Sufficiency Check (< 120 chars)
    const sufficiency = checkSourceSufficiency(sourceText);
    if (!sufficiency.sufficient) {
      issues.push({
        code: 'INSUFFICIENT_EVIDENCE',
        severity: 'critical',
        field: 'sourceText',
        message: `Source content is insufficient for fact verification (${sufficiency.length} characters; minimum required is 120).`,
        createdAt: now,
      });

      validatedFields.title = 'unsupported';
      validatedFields.summary = 'unsupported';
      validatedFields.facts = 'unsupported';
      rejectedFields.push('sourceText');

      const result: NewsValidationResult = {
        id: `val_${createHash('md5').update(`${extractionId}_${inputHash}`).digest('hex').substring(0, 16)}`,
        extractionId,
        status: 'insufficient_evidence',
        overallScore: 0.0,
        issues,
        validatedFields,
        rejectedFields,
        claimCoverage: 0.0,
        sourceCoverage: 0.0,
        categoryValidation: {
          expectedCategory: category,
          extractedCategory: category,
          status: 'acceptable',
          confidence: 0.0,
        },
        dateValidation: { status: 'not_applicable' },
        numberValidation: { numbersChecked: 0, numbersPassed: 0, status: 'not_applicable' },
        quoteValidation: { quotesChecked: 0, quotesPassed: 0, status: 'no_quotes' },
        entityValidation: { entitiesChecked: 0, entitiesPassed: 0, status: 'unsupported' },
        originalityCheck: { copyRiskScore: 0, status: 'original' },
        sensitiveTopicFlags: [],
        validatorVersion: this.validatorVersion,
        inputHash,
        contentHash: PublicationGateService.computeContentHash({
          title,
          summary,
          category,
          content: contentBlocks,
          facts,
        }),
        articleBodyWordCount: countArticleBodyWords(contentBlocks),
        createdAt: now,
        updatedAt: now,
      };

      if (!options.dryRun && this.repository) {
        await this.repository.saveValidation(result);
      }
      return result;
    }

    // 3. Source URL Verification
    const urlValidation = validateSourceUrl(sourceUrl);
    if (!urlValidation.valid) {
      issues.push({
        code: 'SOURCE_URL_INVALID',
        severity: 'critical',
        field: 'sourceUrl',
        message: urlValidation.reason || 'Source URL is invalid or malformed.',
        createdAt: now,
      });
      rejectedFields.push('sourceUrl');
    }

    // 4. Category Classification Heuristic
    const categoryResult = validateCategoryHeuristic(category, title, sourceText, summary);
    if (categoryResult.status === 'mismatch') {
      issues.push({
        code: 'CATEGORY_MISMATCH',
        severity: 'error',
        field: 'category',
        message: `Extracted category '${category}' strongly conflicts with source topic analysis (expected '${categoryResult.expectedCategory}').`,
        evidence: `Category heuristic score confidence: ${categoryResult.confidence}`,
        createdAt: now,
      });
      validatedFields.category = 'contradicted';
      rejectedFields.push('category');
    }

    // 5. Date & Temporal Validation
    const dateResult = validateTemporal(eventDate, publishedAt, sourceText);
    if (dateResult.status === 'mismatch') {
      issues.push({
        code: 'DATE_MISMATCH',
        severity: 'error',
        field: 'eventDate',
        message: `Event date '${eventDate}' is temporally inconsistent with published date '${publishedAt}'.`,
        createdAt: now,
      });
      rejectedFields.push('eventDate');
    } else if (dateResult.status === 'uncertain') {
      issues.push({
        code: 'TEMPORAL_CONFLICT',
        severity: 'warning',
        field: 'eventDate',
        message: `Temporal reference '${eventDate}' lacks clear historical anchor in source text.`,
        createdAt: now,
      });
    }

    // 6. Number & Quantitative Claim Validation
    const numberCheck = validateNumbers(facts, summaryPoints, sourceText);
    if (numberCheck.unsupportedNumbers.length > 0) {
      const isSevere = numberCheck.result.status === 'mismatch';
      issues.push({
        code: 'NUMBER_MISMATCH',
        severity: isSevere ? 'critical' : 'warning',
        field: 'facts.numbers',
        message: `Numbers/metrics not supported in source text: ${numberCheck.unsupportedNumbers.join(', ')}`,
        createdAt: now,
      });
      validatedFields.facts = isSevere ? 'contradicted' : 'needs_review';
      if (isSevere) rejectedFields.push('facts.numbers');
    }

    // 7. Quote Integrity Validation (Fabrication Check)
    const quoteCheck = validateQuotes(contentBlocks, facts, sourceText);
    if (quoteCheck.fabricatedQuotes.length > 0) {
      for (const fabQuote of quoteCheck.fabricatedQuotes) {
        issues.push({
          code: 'QUOTE_UNSUPPORTED',
          severity: 'critical',
          field: 'quotes',
          message: `Direct quotation appears fabricated or missing from source text: "${fabQuote.substring(0, 100)}..."`,
          evidence: fabQuote,
          createdAt: now,
        });
      }
      validatedFields.quotes = 'unsupported';
      rejectedFields.push('quotes');
    }

    // 8. Named Entity Support Validation
    const entityCheck = validateEntities(entities, sourceText);
    if (entityCheck.unsupportedEntities.length > 0) {
      issues.push({
        code: 'ENTITY_UNSUPPORTED',
        severity: 'error',
        field: 'entities',
        message: `Extracted entities not found in source text: ${entityCheck.unsupportedEntities.join(', ')}`,
        createdAt: now,
      });
      validatedFields.entities = 'unsupported';
      rejectedFields.push('entities');
    }

    // 9. Sensitive Topic Detection
    const sensitiveFlags = detectSensitiveTopics(title, summary, facts);
    if (sensitiveFlags.length > 0) {
      issues.push({
        code: 'SENSITIVE_CLAIM',
        severity: 'warning',
        field: 'content',
        message: `Candidate touches sensitive topics requiring editorial scrutiny: ${sensitiveFlags.join(', ')}`,
        createdAt: now,
      });
    }

    // 10. Originality & Verbatim Copy Check
    const blockTexts = contentBlocks.map((b: any) => {
      if (b.text) return b.text;
      if (b.quote) return b.quote;
      if (b.content) return b.content;
      if (Array.isArray(b.items)) return b.items.join(' ');
      return '';
    });
    const fullCandidateBody = [
      summary,
      ...summaryPoints,
      ...blockTexts,
    ].join(' ');
    const originalityCheckResult = checkOriginality(fullCandidateBody, sourceText);
    if (originalityCheckResult.status === 'suspicious') {
      issues.push({
        code: 'CONTENT_COPY_RISK',
        severity: 'warning',
        field: 'content',
        message: 'High degree of verbatim text copied from source (> 250 contiguous characters).',
        evidence: originalityCheckResult.longestContiguousMatch,
        createdAt: now,
      });
    }

    // 11. Headline Quality / Clickbait / Certainty Inflation
    if (title === title.toUpperCase() && title.length > 20) {
      issues.push({
        code: 'CLICKBAIT_HEADLINE',
        severity: 'warning',
        field: 'title',
        message: 'Title contains excessive uppercase characters (clickbait style).',
        createdAt: now,
      });
      validatedFields.title = 'needs_review';
    } else if (title.includes('!!!') || /shocking|you won't believe/i.test(title)) {
      issues.push({
        code: 'CLICKBAIT_HEADLINE',
        severity: 'warning',
        field: 'title',
        message: 'Headline contains sensationalist language or punctuation.',
        createdAt: now,
      });
      validatedFields.title = 'needs_review';
    }

    // 11b. Article Length & Filler Inspection (700-Word Minimum Policy)
    const bodyWordCount = countArticleBodyWords(contentBlocks);
    if (enforceLength) {
      if (bodyWordCount < MIN_ARTICLE_BODY_WORDS) {
        issues.push({
          code: 'INSUFFICIENT_ARTICLE_LENGTH',
          severity: 'error',
          field: 'content',
          message: `Article body has ${bodyWordCount} words, which is below the ${MIN_ARTICLE_BODY_WORDS}-word minimum policy (requires >= ${MIN_ARTICLE_BODY_WORDS} substantive words).`,
          evidence: `Word count: ${bodyWordCount} / ${MIN_ARTICLE_BODY_WORDS}`,
          createdAt: now,
        });
        validatedFields.content = 'needs_review';
        rejectedFields.push('content');
      }

      const fillerCheck = detectFillerText(contentBlocks);
      if (fillerCheck.hasFiller) {
        issues.push({
          code: 'FILLER_PADDING_DETECTED',
          severity: 'error',
          field: 'content',
          message: fillerCheck.reason || 'Article body contains repetitive filler or padding phrases.',
          createdAt: now,
        });
        validatedFields.content = 'needs_review';
        rejectedFields.push('content');
      }
    }

    // 12. Calculate Claim Coverage & Source Coverage
    const totalClaims = Math.max(1, facts.length + entities.length + summaryPoints.length);
    const passedClaims =
      numberCheck.result.numbersPassed +
      entityCheck.result.entitiesPassed +
      quoteCheck.result.quotesPassed +
      (categoryResult.status === 'match' ? 1 : 0);
    const claimCoverage = Math.min(1.0, Math.max(0.0, passedClaims / totalClaims));
    const sourceCoverage = Math.min(1.0, Math.max(0.1, sourceText.length / 3000));

    // 13. Calculate Overall Quality Score
    let score = 1.0;
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 0.5;
          break;
        case 'error':
          score -= 0.2;
          break;
        case 'warning':
          score -= 0.05;
          break;
        default:
          break;
      }
    }
    score = Math.max(0.0, Math.min(1.0, Number(score.toFixed(2))));

    // 14. Determine Final Validation Status
    const hasCritical = issues.some((i) => i.severity === 'critical');
    const hasError = issues.some((i) => i.severity === 'error');
    const hasEditorialRisk = issues.some((i) => i.code === 'CLICKBAIT_HEADLINE' || i.code === 'CONTENT_COPY_RISK');

    let status: ValidationStatus = 'valid';
    if (hasCritical || score < 0.60 || rejectedFields.length >= 2) {
      status = 'rejected';
    } else if (hasError || hasEditorialRisk || sensitiveFlags.length > 0 || score < 0.80 || claimCoverage < 0.70) {
      status = 'needs_review';
    } else {
      status = 'valid';
    }

    const validationId = `val_${createHash('md5').update(`${extractionId}_${inputHash}`).digest('hex').substring(0, 16)}`;

    const contentHash = PublicationGateService.computeContentHash({
      title,
      summary,
      category,
      content: contentBlocks,
      facts,
    });

    const result: NewsValidationResult = {
      id: validationId,
      extractionId,
      status,
      overallScore: score,
      issues,
      validatedFields,
      rejectedFields,
      claimCoverage: Number(claimCoverage.toFixed(2)),
      sourceCoverage: Number(sourceCoverage.toFixed(2)),
      categoryValidation: categoryResult,
      dateValidation: dateResult,
      numberValidation: numberCheck.result,
      quoteValidation: quoteCheck.result,
      entityValidation: entityCheck.result,
      originalityCheck: originalityCheckResult,
      sensitiveTopicFlags: sensitiveFlags,
      validatorVersion: this.validatorVersion,
      inputHash,
      contentHash,
      articleBodyWordCount: bodyWordCount,
      createdAt: now,
      updatedAt: now,
    };

    // 15. Persist if repository provided and not dry run
    if (!options.dryRun && this.repository) {
      await this.repository.saveValidation(result);
    }

    return result;
  }

  /**
   * Verifies that candidate or story content has not mutated since validation.
   */
  public static verifyContentIntegrity(storyOrCandidate: any, validatedHash?: string | null): boolean {
    if (!validatedHash) return false;
    const currentHash = PublicationGateService.computeContentHash(storyOrCandidate);
    return currentHash === validatedHash;
  }
}

