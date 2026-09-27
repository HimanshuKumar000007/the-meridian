/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Story, StorySource } from './story';
import type { StoryLifecycleDecision } from './lifecycle';
import type { NewsValidationResult } from './validation';
import type { ExtractedNewsCandidate } from './extraction';

export type PublicationDecisionType = 'PUBLISH' | 'HOLD' | 'REJECT' | 'UNPUBLISH';

export type PublicationQueueStatus =
  | 'queued'
  | 'processing'
  | 'published'
  | 'held'
  | 'failed'
  | 'unpublished';

export type PublicationReason =
  | 'AUTO_PUBLISH_VALID_CREATE'
  | 'AUTO_PUBLISH_VALID_UPDATE'
  | 'EDITOR_APPROVED'
  | 'RETRY_AFTER_TRANSIENT_FAILURE'
  | 'MANUAL_ADMIN_PUBLISH'
  | 'SENSITIVE_TOPIC'
  | 'VALIDATION_REVIEW'
  | 'VALIDATION_REJECTED'
  | 'LOW_EVIDENCE'
  | 'MISSING_SOURCE'
  | 'MISSING_REQUIRED_FIELD'
  | 'CONFLICT_UNRESOLVED'
  | 'PUBLICATION_POLICY_BLOCK'
  | 'KILL_SWITCH_DISABLED'
  | 'CATEGORY_DISABLED'
  | 'SOURCE_DISABLED'
  | 'SCHEDULED_FUTURE'
  | 'CONTENT_HASH_MISMATCH'
  | 'MALFORMED_CONTENT'
  | 'LIFECYCLE_HOLD_OR_REJECT'
  | 'UNPUBLISHED_BY_OPERATOR';

export interface PublicationDecisionResult {
  decision: PublicationDecisionType;
  reason: PublicationReason;
  blockingIssues: string[];
  publishableFields: string[];
  publicationVersion: number;
  contentHash?: string;
  metadata?: Record<string, any>;
}

export interface PublicationGateInput {
  story: Story;
  lifecycleDecision: StoryLifecycleDecision;
  validation: NewsValidationResult;
  extraction: ExtractedNewsCandidate;
  sources?: StorySource[];
  scheduledFor?: string;
  force?: boolean;
}

export interface PublicationPolicyConfig {
  safeAutomaticCategories: string[];
  reviewRequiredCategories: string[];
  automatedPublishingEnabled: boolean;
  categorySwitches: Record<string, boolean>;
  blockedSources: string[];
  maxBacklogAgeHours: number;
  defaultBatchLimit: number;
  requireHeroImage: boolean;
}

export interface PublicationQueueItem {
  id: string;
  storyId: string;
  lifecycleEventId?: string | null;
  priority: number;
  status: PublicationQueueStatus;
  attempts: number;
  maxAttempts: number;
  scheduledFor?: string | null;
  lastAttemptAt?: string | null;
  lastError?: string | null;
  contentHash?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PublicationEvent {
  id: string;
  storyId: string;
  lifecycleEventId?: string | null;
  action: PublicationDecisionType;
  previousStatus: string;
  newStatus: string;
  publicationVersion: number;
  reason: string;
  blockingIssues: string[];
  validationId?: string | null;
  extractionId?: string | null;
  contentHash?: string | null;
  metadata?: Record<string, any>;
  publishedAt?: string | null;
  createdAt: string;
}

export interface PublicationRun {
  id: string;
  startedAt: string;
  finishedAt?: string | null;
  processed: number;
  published: number;
  updated: number;
  held: number;
  rejected: number;
  failed: number;
  errors: any[];
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface PublicationTelemetry {
  publishedToday: number;
  updatedToday: number;
  heldCount: number;
  rejectedCount: number;
  failedCount: number;
  queueDepth: number;
  averageLatencyMs?: number;
}
