/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ArticleBlock } from './story';
import type { DiscoveryItem } from './discovery';

export type ExtractionStatus = 'queued' | 'processing' | 'completed' | 'needs_review' | 'failed';

export type StoryStatusType =
  | 'normal'
  | 'developing'
  | 'announcement'
  | 'updated'
  | 'analysis'
  | 'review'
  | 'breaking';

export type ExtractionConfidenceLevel = 'exact' | 'high' | 'medium' | 'low' | 'missing' | 'conflicted';

export type EntityType =
  | 'person'
  | 'company'
  | 'organization'
  | 'product'
  | 'game'
  | 'technology'
  | 'location'
  | 'event';

export interface ExtractedEntity {
  name: string;
  type: EntityType;
  relevance: number; // 0 to 1
}

export interface ExtractedFact {
  label: string;
  value: string;
  evidence: string;
  confidence: number; // 0 to 1
}

export interface ExtractedTimelineCandidate {
  date: string;
  title: string;
  description: string;
}

export interface SourceEvidenceItem {
  claim: string;
  evidenceText: string;
  sourceUrl: string;
  confidence: number;
}

/**
 * Universal Structured News Candidate resulting from AI Extraction.
 * This is an internal editorial model and is NOT directly published to the public stories table.
 */
export interface ExtractedNewsCandidate {
  id: string;
  discoveryItemId: string;

  // Editorial Headlines & Summaries
  title: string;
  dek: string;
  summary: string;
  summaryPoints: string[];

  // Taxonomy & Classification
  category: string;
  subcategory: string;
  classificationConfidence: number; // 0 to 1
  topics: string[];

  // Temporal & Attribution
  status: StoryStatusType;
  publishedAt?: string | null;
  eventDate?: string | null;
  author?: string | null;

  // Structured Knowledge
  entities: ExtractedEntity[];
  facts: ExtractedFact[];
  timelineCandidates: ExtractedTimelineCandidate[];

  // Content Blocks for future Story Page
  contentBlocks: ArticleBlock[];

  // Source Tracking & Evidence Verification
  sources: Array<{ name: string; url: string }>;
  heroImage?: string | null;
  sourceEvidence: SourceEvidenceItem[];

  // Quality Signals & Conflict Detection
  overallConfidence: number; // 0 to 1
  confidenceLevel: ExtractionConfidenceLevel;
  hasConflicts: boolean;
  conflictDetails?: string | null;

  // Lifecycle
  extractionStatus: ExtractionStatus;
  model: string;
  promptVersion: string;
  inputHash: string;
  outputHash: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * Database record schema for news_extractions table
 */
export interface NewsExtractionRecord {
  id: string;
  discovery_item_id: string;
  status: ExtractionStatus;
  model: string;
  prompt_version: string;
  input_hash: string;
  output_hash?: string | null;

  title?: string | null;
  dek?: string | null;
  summary?: string | null;
  summary_points?: string[] | null;

  category?: string | null;
  subcategory?: string | null;
  classification_confidence?: number | null;

  content?: ArticleBlock[] | null;
  facts?: ExtractedFact[] | null;
  entities?: ExtractedEntity[] | null;
  timeline_candidates?: ExtractedTimelineCandidate[] | null;
  source_evidence?: SourceEvidenceItem[] | null;

  overall_confidence?: number | null;
  has_conflicts?: boolean;
  conflict_details?: string | null;

  error_code?: string | null;
  error_message?: string | null;

  created_at: string;
  updated_at: string;
}

/**
 * Result of content acquisition from source page
 */
export interface AcquiredSourceContent {
  url: string;
  canonicalUrl: string;
  title: string;
  description: string;
  author?: string | null;
  heroImage?: string | null;
  publishedDate?: string | null;
  articleText: string;
  wordCount: number;
  isTruncated: boolean;
  fetchStatus: 'success' | 'fallback_metadata' | 'insufficient_input';
  statusCode?: number;
  durationMs: number;
  error?: string;
}

/**
 * Extraction Engine Execution Options
 */
export interface ExtractionOptions {
  model?: string;
  promptVersion?: string;
  dryRun?: boolean;
  forceRerun?: boolean;
  timeoutMs?: number;
  maxTokens?: number;
  temperature?: number;
}
