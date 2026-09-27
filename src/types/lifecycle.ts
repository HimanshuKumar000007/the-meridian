/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ExtractedNewsCandidate, ExtractedFact } from './extraction';
import type { NewsValidationResult } from './validation';
import type { Story, StorySource, StoryUpdate, Fact } from './story';

export type LifecycleAction = 'CREATE' | 'UPDATE' | 'NO_OP' | 'HOLD' | 'REJECT';

export type MatchConfidence = 'high' | 'medium' | 'low' | 'none';

export type MatchReason =
  | 'MATCH_CANONICAL_URL'
  | 'MATCH_EXTERNAL_ID'
  | 'MATCH_EVENT_SIGNATURE'
  | 'MATCH_ENTITY_DATE'
  | 'MATCH_EXISTING_CLUSTER'
  | 'MATCH_SEMANTIC_SIMILARITY'
  | 'NO_MATCH';

export interface StoryCluster {
  id: string;
  clusterKey: string;
  canonicalTitle: string;
  primaryCategory: string;
  primarySubcategory?: string | null;
  eventDate?: string | null;
  status: 'active' | 'merged' | 'archived';
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface StoryLifecycleDecision {
  id: string;
  action: LifecycleAction;
  storyId?: string | null;
  clusterId?: string | null;
  matchConfidence: MatchConfidence;
  matchReason: MatchReason;
  reason: string;
  changedFields: string[];
  extractionId?: string | null;
  validationId?: string | null;
  lifecycleVersion: string;
  createdAt: string;
}

export interface StoryLifecycleRecord {
  id: string;
  story_id?: string | null;
  cluster_id?: string | null;
  action: LifecycleAction;
  extraction_id?: string | null;
  validation_id?: string | null;
  match_confidence: MatchConfidence;
  match_reason: MatchReason;
  reason: string;
  changed_fields: string[];
  lifecycle_version: string;
  created_at: string;
}

export interface LifecycleCandidateInput {
  extraction: ExtractedNewsCandidate;
  validation: NewsValidationResult;
  sourceUrl?: string;
  discoveryId?: string;
}

export interface MeaningfulChangeCheckResult {
  isMeaningful: boolean;
  changedFields: string[];
  newFacts: ExtractedFact[];
  newSources: Array<{ name: string; url: string }>;
  newDate?: string | null;
  reason: string;
}

export interface StoryMatchResult {
  matchedStory: Story | null;
  matchedCluster: StoryCluster | null;
  confidence: MatchConfidence;
  reason: MatchReason;
  similarityScore?: number;
}
