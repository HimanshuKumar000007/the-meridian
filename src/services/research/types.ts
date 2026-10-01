/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Multi-Source News Monitor & Research Architecture Types
 */

import type { DiscoveryItem } from '../../types/discovery';
import type { ExtractedNewsCandidate } from '../../types/extraction';
import type { NewsValidationResult } from '../../types/validation';
import type { PublicationDecisionResult } from '../../types/publishing';
import type { ArticleBlock } from '../../types/story';

export type AllowedSourceUsage = 'story_lead' | 'full_reference' | 'official_record';

export interface ApprovedSource {
  source_id: string;
  source_name: string;
  feed_url: string;
  source_type: 'rss' | 'atom' | 'official_feed';
  is_active: boolean;
  polling_cadence_minutes: number;
  priority: number;
  allowed_usage: AllowedSourceUsage;
  is_official: boolean;
  category_hints: string[];
  last_polled_at?: string | null;
  last_success_at?: string | null;
  last_error_at?: string | null;
  last_error?: string | null;
  consecutive_failures: number;
}

export interface StoryLead {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  canonicalUrl: string;
  publishedAt: string;
  description: string;
  categoryHint?: string;
  fingerprint: string;
  discoveredAt: string;
  rawPayload?: any;
}

export interface EventCluster {
  clusterId: string;
  canonicalTitle: string;
  category: string;
  firstSeenAt: string;
  lastUpdatedAt: string;
  leads: StoryLead[];
  sourceIds: string[];
  sourceUrls: string[];
  hasOfficialSource: boolean;
  entities: string[];
}

export type FactDimension =
  | 'who'
  | 'what'
  | 'when'
  | 'where'
  | 'why'
  | 'number'
  | 'quote'
  | 'statement';

export interface FactClaim {
  id: string;
  dimension: FactDimension;
  claim: string;
  value?: string;
  unit?: string;
  entityName?: string;
  speaker?: string;
  supportingSource: string;
  sourceUrl: string;
  confidence: number;
  isConflict?: boolean;
  conflictReason?: string;
}

export interface SourceConsultation {
  sourceName: string;
  url: string;
  status: 'accessible' | 'blocked' | 'paywalled' | 'empty' | 'timeout' | 'unsafe_url';
  factsExtractedCount: number;
  error?: string;
  durationMs: number;
}

export interface UnifiedEvidenceSet {
  clusterId: string;
  eventTitle: string;
  category: string;
  facts: FactClaim[];
  namedEntities: Array<{ name: string; type: string; frequency: number }>;
  numbersAndMetrics: Array<{ label: string; value: string; evidence: string }>;
  quotes: Array<{ quote: string; speaker: string; attributionUrl: string }>;
  officialStatements: Array<{ statement: string; organization: string; url: string }>;
  sourcesConsulted: SourceConsultation[];
  accessibleSourcesCount: number;
  blockedSourcesCount: number;
  hasConflicts: boolean;
  conflicts: string[];
  assembledAt: string;
}

export interface SufficiencyEvaluation {
  isSufficient: boolean;
  score: number; // 0.0 to 1.0
  reasons: string[];
  missingDimensions: string[];
  eligibleForNvidia: boolean;
  recommendedAction:
    | 'PROCEED_TO_SYNTHESIS'
    | 'HOLD_INSUFFICIENT_EVIDENCE'
    | 'HOLD_BLOCKED_SOURCES';
  metrics: {
    totalFacts: number;
    dimensionsCovered: number;
    accessibleSources: number;
    hasOfficialCorroboration: boolean;
  };
}

export interface ResearchArticleDraft {
  clusterId: string;
  title: string;
  dek: string;
  summary: string;
  category: string;
  contentBlocks: ArticleBlock[];
  wordCount: number;
  isBritishEnglish: boolean;
  preservesConflicts: boolean;
  usedFactsCount: number;
  nvidiaDurationMs: number;
  nvidiaModel?: string;
  tokensUsed?: number;
  rawCandidate: ExtractedNewsCandidate;
}

export type ResearchQueueStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'insufficient_evidence'
  | 'blocked_source'
  | 'failed'
  | 'dead_letter';

export interface ResearchQueueItem {
  id: string;
  clusterId: string;
  status: ResearchQueueStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface ShadowPipelineComparison {
  id: string;
  timestamp: string;
  clusterId: string;
  eventTitle: string;
  newArchResult: {
    evidenceCount: number;
    sourcesFound: number;
    accessibleSources: number;
    blockedSources: number;
    researchCompletenessScore: number;
    wouldCallNvidia: boolean;
    articleLengthEstimate: number;
    wordCountPasses700: boolean;
    validationStatus: string;
    expectedDecision: 'PUBLISH' | 'HOLD' | 'REJECT';
    durationMs: number;
  };
  currentPipelineResult?: {
    fetchStatus: string;
    extractionStatus: string;
    nvidiaDurationMs: number;
    wordCount: number;
    validationStatus: string;
    publicationDecision: string;
  };
  comparisonNotes: string;
}

export interface ResearchDashboardMetrics {
  researchPending: number;
  researchCompleted: number;
  insufficientEvidence: number;
  blockedSources: number;
  researchFailureRate: number;
  averageResearchDurationMs: number;
  sourceCountPerEvent: number;
  multiSourceEvents: {
    eventsWith2PlusSources: number;
    eventsWithOfficialSource: number;
    sourceDisagreementCount: number;
  };
  nvidia: {
    requests: number;
    success: number;
    timeout: number;
    averageDurationMs: number;
    costOrTokenUsage?: string;
  };
}
