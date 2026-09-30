/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Types for the Internal Operations Dashboard
 */

import type { AutomationStage, AutomationHealthState, AutomationRun } from './automation';

export type TimeRangeOption = '1h' | '24h' | '7d' | '30d';

export interface SystemHealthSummary {
  websiteStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  schedulerStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DISABLED';
  extractionStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DISABLED';
  validationStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DISABLED';
  lifecycleStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DISABLED';
  mediaStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DISABLED';
  publishingStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DISABLED';
  automaticPublishingEnabled: boolean;
  activeLocksCount: number;
  activeLockDetails?: {
    lockName: string;
    ownerId: string;
    acquiredAt: string;
    expiresAt: string;
  } | null;
  orphanedRunsCount: number;
  latestSuccessfulRunAt: string | null;
  latestFailedRunAt: string | null;
  alerts: string[];
}

export interface FunnelStageMetrics {
  stage: AutomationStage | 'media';
  label: string;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

export interface PublishingMonitorMetrics {
  automaticPublishingEnabled: boolean;
  publishedToday: number;
  publishedLast24Hours: number;
  publishedLast7Days: number;
  publishedLast30Days: number;
  heldStoriesCount: number;
  rejectedStoriesCount: number;
  reviewRequiredCount: number;
  publicationQueueDepth: number;
  queuedItems: Array<{
    id: string;
    storyId: string;
    status: string;
    attempts: number;
    lastError?: string | null;
    createdAt: string;
  }>;
}

export interface ArticleQualityMetrics {
  averageBodyWordCount: number;
  minBodyWordCount: number;
  maxBodyWordCount: number;
  countBelow700Words: number;
  totalEvaluated: number;
  validationPassRate: number;
  rejectionRate: number;
  needsReviewRate: number;
  insufficientEvidenceCount: number;
  mediaSuccessRate: number;
  duplicatePreventionEvents: number;
}

export interface ExtractionMonitorMetrics {
  totalAttempts: number;
  succeeded: number;
  failed: number;
  timeoutCount: number;
  retryCount: number;
  deadLetterCount: number;
  averageDurationMs: number;
  truePendingCount: number;
}

export interface ValidationMonitorMetrics {
  totalValidated: number;
  valid: number;
  invalid: number;
  needsReview: number;
  insufficientEvidence: number;
  averageDurationMs: number;
  truePendingCount: number;
}

export interface LifecycleMonitorMetrics {
  totalProcessed: number;
  outcomes: {
    create: number;
    update: number;
    hold: number;
    reject: number;
    publish: number;
  };
  recentEvents: Array<{
    id: string;
    storyId: string;
    action: string;
    createdAt: string;
  }>;
}

export interface MediaMonitorMetrics {
  processed: number;
  succeeded: number;
  failed: number;
  fallbackCount: number;
  queueDepth: number;
}

export interface QueueMetricsSummary {
  discovery: number;
  extraction: number;
  validation: number;
  lifecycle: number;
  media: number;
  publishing: number;
}

export interface PerformanceMetrics {
  averageAutomationRuntimeMs: number;
  p95RuntimeMs?: number;
  averageExtractionDurationMs: number;
  averageValidationDurationMs: number;
  averageLifecycleDurationMs: number;
  averagePublishingDurationMs: number;
  timeoutCount: number;
}

export interface DashboardOverview {
  generatedAt: string;
  timeRange: TimeRangeOption;
  health: SystemHealthSummary;
  funnel: FunnelStageMetrics[];
  publishing: PublishingMonitorMetrics;
  quality: ArticleQualityMetrics;
  extraction: ExtractionMonitorMetrics;
  validation: ValidationMonitorMetrics;
  lifecycle: LifecycleMonitorMetrics;
  media: MediaMonitorMetrics;
  queues: QueueMetricsSummary;
  performance: PerformanceMetrics;
  recentRuns: AutomationRun[];
}

export interface DashboardStoryItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: string;
  bodyWordCount: number;
  isLengthValid: boolean;
  publishedAt: string | null;
  publishedVersion: number;
  createdAt: string;
  sourceUrl?: string | null;
  finalUrl: string;
}

export interface DashboardErrorItem {
  id: string;
  timestamp: string;
  stage: string;
  errorCode: string;
  errorMessage: string;
  runId?: string | null;
  referenceId?: string | null;
}
