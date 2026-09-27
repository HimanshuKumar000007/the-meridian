/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Phase 10: Universal Automation Scheduler & Pipeline Orchestrator Types
 */

export type AutomationStage =
  | 'discovery'
  | 'extraction'
  | 'validation'
  | 'lifecycle'
  | 'publishing';

export type AutomationRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'skipped'
  | 'disabled';

export type AutomationTrigger =
  | 'cron'
  | 'manual'
  | 'api'
  | 'retry'
  | 'dependency'
  | 'dry_run';

export type AutomationHealthState =
  | 'healthy'
  | 'degraded'
  | 'failed'
  | 'disabled'
  | 'stale';

export interface RetryPolicy {
  maxRetries: number;
  backoffMinutes: number;
}

export interface AutomationSchedule {
  stage: AutomationStage;
  enabled: boolean;
  targetIntervalMinutes: number;
  maxBatchSize: number;
  priority: number;
  maxConcurrentRuns: number;
  retryPolicy: RetryPolicy;
  lastRunAt?: string | null;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  nextDueAt?: string | null;
  consecutiveFailures: number;
  metadata?: Record<string, any>;
}

export interface AutomationLock {
  lockName: string;
  ownerId: string;
  acquiredAt: string;
  expiresAt: string;
  metadata?: Record<string, any>;
}

export interface AutomationRun {
  id: string;
  runType: string;
  status: AutomationRunStatus;
  trigger: AutomationTrigger;
  startedAt: string;
  finishedAt?: string | null;
  durationMs?: number | null;
  sources: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: string[];
  metadata: Record<string, any>;
  createdAt: string;
}

export interface AutomationEvent {
  id: string;
  runId?: string;
  stage: AutomationStage | 'orchestrator';
  eventType: string;
  severity: 'info' | 'warn' | 'error' | 'critical';
  message: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface StageRunResult {
  stage: AutomationStage;
  status: AutomationRunStatus;
  durationMs: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  remainingQueue: number;
  errors: string[];
  metadata?: Record<string, any>;
}

export interface AutomationMetrics {
  discoveryToExtractionCount: number;
  extractionToValidationCount: number;
  validationToLifecycleCount: number;
  lifecycleToPublicationCount: number;
  queueDepths: Record<AutomationStage, number>;
  oldestPendingAgeMinutes: Record<AutomationStage, number | null>;
}

export interface OrchestratorRunResult {
  runId: string;
  trigger: AutomationTrigger;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: AutomationRunStatus;
  stageResults: Record<AutomationStage, StageRunResult | null>;
  isDryRun: boolean;
  lockAcquired: boolean;
  errors: string[];
  metrics?: AutomationMetrics;
  planCapability?: PlanCapability;
}

export interface PlanCapability {
  plan: 'hobby' | 'pro' | 'enterprise' | 'custom' | 'unknown';
  supportsDaily: boolean;
  supportsHourly: boolean;
  supportsMinuteLevel: boolean;
  minIntervalMinutes: number;
  configuredCronSchedule: string;
  activeCadenceDescription: string;
  targetCadenceDescription: string;
  canDeliverTargetCadence: boolean;
  status: 'SCHEDULE_AVAILABLE' | 'SCHEDULE_UNAVAILABLE';
  reason: string;
  externalSchedulerSupported: boolean;
  upgradeOrExternalAlternative: string;
}

export interface AutomationConfig {
  enabled: boolean;
  cronSecret?: string;
  lockTtlSeconds: number;
  stageEnabled: Record<AutomationStage, boolean>;
  maxBatch: Record<AutomationStage, number>;
  targetIntervals: Record<AutomationStage, number>;
}
