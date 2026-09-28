/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ValidationStatus = 'valid' | 'needs_review' | 'rejected' | 'insufficient_evidence';

export type ValidationSeverity = 'info' | 'warning' | 'error' | 'critical';

export type ValidationIssueCode =
  | 'UNSUPPORTED_CLAIM'
  | 'CONTRADICTED_CLAIM'
  | 'CATEGORY_MISMATCH'
  | 'DATE_MISMATCH'
  | 'NUMBER_MISMATCH'
  | 'QUOTE_UNSUPPORTED'
  | 'ENTITY_UNSUPPORTED'
  | 'SOURCE_MISSING'
  | 'SOURCE_URL_INVALID'
  | 'IMAGE_PROVENANCE_UNKNOWN'
  | 'INSUFFICIENT_EVIDENCE'
  | 'CONTENT_COPY_RISK'
  | 'SENSITIVE_CLAIM'
  | 'TEMPORAL_CONFLICT'
  | 'CERTAINTY_INFLATION'
  | 'CLICKBAIT_HEADLINE'
  | 'INSUFFICIENT_ARTICLE_LENGTH'
  | 'FILLER_PADDING_DETECTED';

export interface ValidationIssue {
  code: ValidationIssueCode;
  severity: ValidationSeverity;
  field: string;
  message: string;
  evidence?: string | null;
  createdAt: string;
}

export type FieldStatus = 'validated' | 'needs_review' | 'unsupported' | 'contradicted' | 'missing';

export interface FieldValidationDetail {
  field: string;
  status: FieldStatus;
  score: number; // 0 to 1
  message?: string;
}

export interface CategoryValidationResult {
  expectedCategory: string;
  extractedCategory: string;
  status: 'match' | 'acceptable' | 'mismatch';
  confidence: number;
}

export interface DateValidationResult {
  eventDate?: string | null;
  publishedAt?: string | null;
  status: 'valid' | 'mismatch' | 'uncertain' | 'not_applicable';
}

export interface NumberValidationResult {
  numbersChecked: number;
  numbersPassed: number;
  status: 'valid' | 'mismatch' | 'unsupported' | 'not_applicable';
}

export interface QuoteValidationResult {
  quotesChecked: number;
  quotesPassed: number;
  status: 'valid' | 'fabricated' | 'no_quotes';
}

export interface EntityValidationResult {
  entitiesChecked: number;
  entitiesPassed: number;
  status: 'valid' | 'unsupported';
}

export interface OriginalityValidationResult {
  copyRiskScore: number; // 0 to 1 (higher = excessive verbatim copy)
  status: 'original' | 'suspicious';
  longestContiguousMatch?: string | null;
}

/**
 * Universal News Fact Validation Result Model (Phase 7)
 */
export interface NewsValidationResult {
  id: string;
  extractionId: string;
  status: ValidationStatus;
  overallScore: number; // 0.0 to 1.0

  issues: ValidationIssue[];
  validatedFields: Record<string, FieldStatus>;
  rejectedFields: string[];

  claimCoverage: number; // 0.0 to 1.0
  sourceCoverage: number; // 0.0 to 1.0

  categoryValidation: CategoryValidationResult;
  dateValidation: DateValidationResult;
  numberValidation: NumberValidationResult;
  quoteValidation: QuoteValidationResult;
  entityValidation: EntityValidationResult;
  originalityCheck: OriginalityValidationResult;

  sensitiveTopicFlags: string[];

  validatorVersion: string;
  inputHash: string;
  contentHash?: string;
  articleBodyWordCount?: number;

  createdAt: string;
  updatedAt: string;
}

/**
 * Database record schema for news_validations table
 */
export interface NewsValidationRecord {
  id: string;
  extraction_id: string;
  status: ValidationStatus;
  overall_score: number;

  issues: ValidationIssue[];
  validated_fields: Record<string, FieldStatus>;
  rejected_fields: string[];

  claim_coverage: number;
  source_coverage: number;

  category_status: string;
  date_status: string;
  number_status: string;
  quote_status: string;
  entity_status: string;

  sensitive_topic_flags: string[];
  validator_version: string;
  input_hash: string;

  created_at: string;
  updated_at: string;
}

export interface ValidationFilter {
  status?: ValidationStatus;
  extractionId?: string;
  limit?: number;
  offset?: number;
}
