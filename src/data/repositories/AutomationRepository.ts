/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * AutomationRepository Interface
 */

import type {
  AutomationStage,
  AutomationRun,
  AutomationEvent,
  AutomationSchedule,
  AutomationLock,
} from '../../types/automation';

export interface AutomationRepository {
  /**
   * Acquire a distributed lock. If expired or non-existent, succeeds.
   */
  acquireLock(lockName: string, ownerId: string, ttlSeconds: number): Promise<boolean>;

  /**
   * Release a distributed lock owned by ownerId.
   */
  releaseLock(lockName: string, ownerId: string): Promise<boolean>;

  /**
   * Force release or inspect a lock.
   */
  getLock(lockName: string): Promise<AutomationLock | null>;

  /**
   * Record a new automation run.
   */
  createRun(run: Partial<AutomationRun>): Promise<AutomationRun>;

  /**
   * Update an existing automation run.
   */
  updateRun(id: string, updates: Partial<AutomationRun>): Promise<AutomationRun>;

  /**
   * Record a granular audit event.
   */
  recordEvent(event: Partial<AutomationEvent>): Promise<AutomationEvent>;

  /**
   * Get all stage schedules and their last run states.
   */
  getSchedules(): Promise<AutomationSchedule[]>;

  /**
   * Update stage schedule metadata.
   */
  updateSchedule(
    stage: AutomationStage,
    updates: Partial<AutomationSchedule>
  ): Promise<AutomationSchedule>;

  /**
   * Retrieve recent runs for telemetry and status checks.
   */
  getRecentRuns(limit?: number): Promise<AutomationRun[]>;

  /**
   * Get queue depths for each stage of the pipeline.
   */
  getQueueDepths(): Promise<Record<AutomationStage, number>>;

  /**
   * Get age in minutes of the oldest pending item in each queue.
   */
  getOldestPendingAges(): Promise<Record<AutomationStage, number | null>>;

  /**
   * Recovers runs left in 'running' state after serverless environment timeouts.
   */
  recoverStaleRuns(maxAgeSeconds?: number): Promise<number>;
}

