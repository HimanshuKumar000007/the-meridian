/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * MockAutomationRepository (In-Memory Implementation for Testing & Mock Mode)
 */

import type { AutomationRepository } from './AutomationRepository';
import type {
  AutomationStage,
  AutomationRun,
  AutomationEvent,
  AutomationSchedule,
  AutomationLock,
} from '../../types/automation';

export class MockAutomationRepository implements AutomationRepository {
  private locks = new Map<string, AutomationLock>();
  private runs: AutomationRun[] = [];
  private events: AutomationEvent[] = [];
  private schedules = new Map<AutomationStage, AutomationSchedule>();

  public queueDepths: Record<AutomationStage, number> = {
    discovery: 15,
    extraction: 8,
    validation: 4,
    lifecycle: 2,
    publishing: 1,
  };

  public oldestPendingAges: Record<AutomationStage, number | null> = {
    discovery: 45,
    extraction: 25,
    validation: 12,
    lifecycle: 5,
    publishing: 2,
  };

  constructor() {
    this.initDefaultSchedules();
  }

  private initDefaultSchedules(): void {
    const stages: AutomationStage[] = [
      'discovery',
      'extraction',
      'validation',
      'lifecycle',
      'publishing',
    ];
    for (const stage of stages) {
      this.schedules.set(stage, {
        stage,
        enabled: true,
        targetIntervalMinutes: stage === 'discovery' ? 60 : 10,
        maxBatchSize: stage === 'validation' || stage === 'lifecycle' ? 10 : 5,
        priority: 1,
        maxConcurrentRuns: 1,
        retryPolicy: { maxRetries: 3, backoffMinutes: 5 },
        consecutiveFailures: 0,
        nextDueAt: new Date(Date.now() - 1000).toISOString(),
      });
    }
  }

  async acquireLock(
    lockName: string,
    ownerId: string,
    ttlSeconds: number
  ): Promise<boolean> {
    const now = new Date();
    const existing = this.locks.get(lockName);

    if (existing) {
      const expiresAt = new Date(existing.expiresAt);
      if (expiresAt > now && existing.ownerId !== ownerId) {
        // Active lock held by someone else
        return false;
      }
    }

    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    this.locks.set(lockName, {
      lockName,
      ownerId,
      acquiredAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
    return true;
  }

  async releaseLock(lockName: string, ownerId: string): Promise<boolean> {
    const existing = this.locks.get(lockName);
    if (!existing) return true;
    if (existing.ownerId === ownerId) {
      this.locks.delete(lockName);
      return true;
    }
    return false;
  }

  async getLock(lockName: string): Promise<AutomationLock | null> {
    const lock = this.locks.get(lockName);
    return lock ? { ...lock } : null;
  }

  async createRun(run: Partial<AutomationRun>): Promise<AutomationRun> {
    const newRun: AutomationRun = {
      id: run.id || `run-mock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      runType: run.runType || 'orchestrator',
      status: run.status || 'running',
      trigger: run.trigger || 'manual',
      startedAt: run.startedAt || new Date().toISOString(),
      finishedAt: run.finishedAt || null,
      durationMs: run.durationMs || null,
      sources: run.sources || 0,
      processed: run.processed || 0,
      succeeded: run.succeeded || 0,
      failed: run.failed || 0,
      skipped: run.skipped || 0,
      errors: run.errors || [],
      metadata: run.metadata || {},
      createdAt: new Date().toISOString(),
    };
    this.runs.push(newRun);
    return { ...newRun };
  }

  async updateRun(
    id: string,
    updates: Partial<AutomationRun>
  ): Promise<AutomationRun> {
    const idx = this.runs.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error(`Automation run ${id} not found.`);
    }
    const updated = {
      ...this.runs[idx],
      ...updates,
    };
    this.runs[idx] = updated;
    return { ...updated };
  }

  async recordEvent(
    event: Partial<AutomationEvent>
  ): Promise<AutomationEvent> {
    const newEvent: AutomationEvent = {
      id: event.id || `evt-mock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      runId: event.runId,
      stage: event.stage || 'orchestrator',
      eventType: event.eventType || 'INFO',
      severity: event.severity || 'info',
      message: event.message || '',
      metadata: event.metadata || {},
      createdAt: new Date().toISOString(),
    };
    this.events.push(newEvent);
    return { ...newEvent };
  }

  async getSchedules(): Promise<AutomationSchedule[]> {
    return Array.from(this.schedules.values()).map((s) => ({ ...s }));
  }

  async updateSchedule(
    stage: AutomationStage,
    updates: Partial<AutomationSchedule>
  ): Promise<AutomationSchedule> {
    const current = this.schedules.get(stage);
    if (!current) {
      throw new Error(`Schedule for stage ${stage} not found.`);
    }
    const updated = { ...current, ...updates };
    this.schedules.set(stage, updated);
    return { ...updated };
  }

  async getRecentRuns(limit = 10): Promise<AutomationRun[]> {
    return [...this.runs]
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit);
  }

  async getQueueDepths(): Promise<Record<AutomationStage, number>> {
    return { ...this.queueDepths };
  }

  async getOldestPendingAges(): Promise<Record<AutomationStage, number | null>> {
    return { ...this.oldestPendingAges };
  }
}
