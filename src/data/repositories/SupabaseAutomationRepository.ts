/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * SupabaseAutomationRepository (Production Implementation)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AutomationRepository } from './AutomationRepository';
import type {
  AutomationStage,
  AutomationRun,
  AutomationEvent,
  AutomationSchedule,
  AutomationLock,
} from '../../types/automation';
import { getRecencyCutoffIso } from '../../config/discoveryRecencyPolicy';
import {
  parseExtractionRetryInfo,
  shouldRetryExtraction,
  getMaxExtractionRetries,
} from '../../config/extractionRetryPolicy';


export class SupabaseAutomationRepository implements AutomationRepository {
  constructor(private client: SupabaseClient) {}

  async acquireLock(
    lockName: string,
    ownerId: string,
    ttlSeconds: number
  ): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    const { data: lock, error: fetchErr } = await this.client
      .from('automation_locks')
      .select('*')
      .eq('lock_name', lockName)
      .maybeSingle();

    if (fetchErr) {
      console.error('[SupabaseAutomationRepo] acquireLock fetch error:', fetchErr);
      return false;
    }

    if (!lock) {
      const { error: insertErr } = await this.client
        .from('automation_locks')
        .insert({
          lock_name: lockName,
          owner_id: ownerId,
          acquired_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          metadata: { initial_ttl_sec: ttlSeconds },
        });

      if (insertErr) {
        // Contention: another worker might have inserted concurrently
        return false;
      }
      return true;
    }

    // Check if expired or owned by the same worker
    const isExpired = new Date(lock.expires_at).getTime() <= now.getTime();
    if (isExpired || lock.owner_id === ownerId) {
      const { error: updateErr } = await this.client
        .from('automation_locks')
        .update({
          owner_id: ownerId,
          acquired_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          metadata: {
            ...lock.metadata,
            recovered_at: now.toISOString(),
            previous_owner: lock.owner_id,
          },
        })
        .eq('lock_name', lockName);

      return !updateErr;
    }

    // Active lock held by someone else
    return false;
  }

  async releaseLock(lockName: string, ownerId: string): Promise<boolean> {
    const { error } = await this.client
      .from('automation_locks')
      .delete()
      .eq('lock_name', lockName)
      .eq('owner_id', ownerId);

    if (error) {
      console.error('[SupabaseAutomationRepo] releaseLock error:', error);
      return false;
    }
    return true;
  }

  async getLock(lockName: string): Promise<AutomationLock | null> {
    const { data, error } = await this.client
      .from('automation_locks')
      .select('*')
      .eq('lock_name', lockName)
      .maybeSingle();

    if (error || !data) return null;

    return {
      lockName: data.lock_name,
      ownerId: data.owner_id,
      acquiredAt: data.acquired_at,
      expiresAt: data.expires_at,
      metadata: data.metadata || {},
    };
  }

  async createRun(run: Partial<AutomationRun>): Promise<AutomationRun> {
    const id = run.id || `run-orch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const row = {
      id,
      run_type: run.runType || 'orchestrator',
      status: run.status || 'running',
      trigger: run.trigger || 'cron',
      started_at: run.startedAt || now,
      finished_at: run.finishedAt || null,
      duration_ms: run.durationMs || null,
      sources: run.sources || 0,
      processed: run.processed || 0,
      succeeded: run.succeeded || 0,
      failed: run.failed || 0,
      skipped: run.skipped || 0,
      errors: run.errors || [],
      metadata: run.metadata || {},
      created_at: now,
    };

    const { data, error } = await this.client
      .from('automation_runs')
      .insert(row)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create automation run: ${error?.message}`);
    }

    return {
      id: data.id,
      runType: data.run_type,
      status: data.status,
      trigger: data.trigger,
      startedAt: data.started_at,
      finishedAt: data.finished_at,
      durationMs: data.duration_ms,
      sources: data.sources,
      processed: data.processed,
      succeeded: data.succeeded,
      failed: data.failed,
      skipped: data.skipped,
      errors: data.errors || [],
      metadata: data.metadata || {},
      createdAt: data.created_at,
    };
  }

  async updateRun(
    id: string,
    updates: Partial<AutomationRun>
  ): Promise<AutomationRun> {
    const patch: Record<string, any> = {};
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.finishedAt !== undefined) patch.finished_at = updates.finishedAt;
    if (updates.durationMs !== undefined) patch.duration_ms = updates.durationMs;
    if (updates.sources !== undefined) patch.sources = updates.sources;
    if (updates.processed !== undefined) patch.processed = updates.processed;
    if (updates.succeeded !== undefined) patch.succeeded = updates.succeeded;
    if (updates.failed !== undefined) patch.failed = updates.failed;
    if (updates.skipped !== undefined) patch.skipped = updates.skipped;
    if (updates.errors !== undefined) patch.errors = updates.errors;
    if (updates.metadata !== undefined) patch.metadata = updates.metadata;

    const { data, error } = await this.client
      .from('automation_runs')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update automation run ${id}: ${error?.message}`);
    }

    return {
      id: data.id,
      runType: data.run_type,
      status: data.status,
      trigger: data.trigger,
      startedAt: data.started_at,
      finishedAt: data.finished_at,
      durationMs: data.duration_ms,
      sources: data.sources,
      processed: data.processed,
      succeeded: data.succeeded,
      failed: data.failed,
      skipped: data.skipped,
      errors: data.errors || [],
      metadata: data.metadata || {},
      createdAt: data.created_at,
    };
  }

  async recordEvent(
    event: Partial<AutomationEvent>
  ): Promise<AutomationEvent> {
    const id = event.id || `evt-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const row = {
      id,
      run_id: event.runId || null,
      stage: event.stage || 'orchestrator',
      event_type: event.eventType || 'INFO',
      severity: event.severity || 'info',
      message: event.message || '',
      metadata: event.metadata || {},
      created_at: now,
    };

    const { data, error } = await this.client
      .from('automation_events')
      .insert(row)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to record automation event: ${error?.message}`);
    }

    return {
      id: data.id,
      runId: data.run_id,
      stage: data.stage,
      eventType: data.event_type,
      severity: data.severity,
      message: data.message,
      metadata: data.metadata || {},
      createdAt: data.created_at,
    };
  }

  async getSchedules(): Promise<AutomationSchedule[]> {
    const { data, error } = await this.client
      .from('automation_schedules')
      .select('*')
      .order('stage', { ascending: true });

    if (error || !data) {
      throw new Error(`Failed to fetch automation schedules: ${error?.message}`);
    }

    return data.map((row) => ({
      stage: row.stage as AutomationStage,
      enabled: row.enabled,
      targetIntervalMinutes: row.target_interval_minutes,
      maxBatchSize: row.max_batch_size,
      priority: 1,
      maxConcurrentRuns: 1,
      retryPolicy: { maxRetries: 3, backoffMinutes: 5 },
      lastRunAt: row.last_run_at,
      lastSuccessAt: row.last_success_at,
      lastFailureAt: row.last_failure_at,
      nextDueAt: row.next_due_at,
      consecutiveFailures: row.consecutive_failures,
      metadata: row.metadata || {},
    }));
  }

  async updateSchedule(
    stage: AutomationStage,
    updates: Partial<AutomationSchedule>
  ): Promise<AutomationSchedule> {
    const patch: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.enabled !== undefined) patch.enabled = updates.enabled;
    if (updates.targetIntervalMinutes !== undefined) {
      patch.target_interval_minutes = updates.targetIntervalMinutes;
    }
    if (updates.maxBatchSize !== undefined) {
      patch.max_batch_size = updates.maxBatchSize;
    }
    if (updates.lastRunAt !== undefined) patch.last_run_at = updates.lastRunAt;
    if (updates.lastSuccessAt !== undefined) patch.last_success_at = updates.lastSuccessAt;
    if (updates.lastFailureAt !== undefined) patch.last_failure_at = updates.lastFailureAt;
    if (updates.nextDueAt !== undefined) patch.next_due_at = updates.nextDueAt;
    if (updates.consecutiveFailures !== undefined) {
      patch.consecutive_failures = updates.consecutiveFailures;
    }
    if (updates.metadata !== undefined) patch.metadata = updates.metadata;

    const { data, error } = await this.client
      .from('automation_schedules')
      .update(patch)
      .eq('stage', stage)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update schedule for stage ${stage}: ${error?.message}`);
    }

    return {
      stage: data.stage as AutomationStage,
      enabled: data.enabled,
      targetIntervalMinutes: data.target_interval_minutes,
      maxBatchSize: data.max_batch_size,
      priority: 1,
      maxConcurrentRuns: 1,
      retryPolicy: { maxRetries: 3, backoffMinutes: 5 },
      lastRunAt: data.last_run_at,
      lastSuccessAt: data.last_success_at,
      lastFailureAt: data.last_failure_at,
      nextDueAt: data.next_due_at,
      consecutiveFailures: data.consecutive_failures,
      metadata: data.metadata || {},
    };
  }

  async getRecentRuns(limit = 10): Promise<AutomationRun[]> {
    const { data, error } = await this.client
      .from('automation_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      runType: row.run_type,
      status: row.status,
      trigger: row.trigger,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      durationMs: row.duration_ms,
      sources: row.sources,
      processed: row.processed,
      succeeded: row.succeeded,
      failed: row.failed,
      skipped: row.skipped,
      errors: row.errors || [],
      metadata: row.metadata || {},
      createdAt: row.created_at,
    }));
  }

  async getQueueDepths(): Promise<Record<AutomationStage, number>> {
    try {
      // 1. Discovery queue (active sources due)
      const { count: discCount } = await this.client
        .from('news_sources')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // 2. Extraction queue (active discovery items within recency window not yet extracted or dead-lettered)
      const { data: extractionRows } = await this.client
        .from('news_extractions')
        .select('discovery_item_id, status, error_code, conflict_details');

      const maxRetries = getMaxExtractionRetries();
      const excludedDiscoveryIds = new Set<string>();
      for (const row of extractionRows || []) {
        if (row.status === 'completed' || row.status === 'needs_review') {
          excludedDiscoveryIds.add(row.discovery_item_id);
        } else if (row.status === 'failed') {
          const info = parseExtractionRetryInfo(row.conflict_details, row.error_code);
          if (!shouldRetryExtraction(info.attempts, row.error_code, maxRetries)) {
            excludedDiscoveryIds.add(row.discovery_item_id);
          }
        }
      }

      const recencyCutoff = getRecencyCutoffIso();
      const { data: activeDiscoveryItems } = await this.client
        .from('news_discovery_items')
        .select('id, published_at, discovered_at')
        .in('status', ['new', 'candidate'])
        .or(`published_at.gte.${recencyCutoff},and(published_at.is.null,discovered_at.gte.${recencyCutoff})`);

      const pendingDiscovery = (activeDiscoveryItems || []).filter(
        (d: any) => !excludedDiscoveryIds.has(d.id)
      );

      // 3. Validation queue (completed extractions that do NOT yet have a validation record)
      const { data: completedExtractions } = await this.client
        .from('news_extractions')
        .select('id, created_at')
        .eq('status', 'completed');

      const { data: existingValidations } = await this.client
        .from('news_validations')
        .select('extraction_id');

      const validatedIds = new Set((existingValidations || []).map((v: any) => v.extraction_id));
      const unvalidated = (completedExtractions || []).filter(
        (e: any) => !validatedIds.has(e.id)
      );

      // 4. Lifecycle queue (valid validations)
      const { count: lifeCount } = await this.client
        .from('news_validations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'valid');

      // 5. Publishing queue (queued items)
      const { count: pubCount } = await this.client
        .from('publication_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued');

      return {
        discovery: discCount || 0,
        extraction: pendingDiscovery.length,
        validation: unvalidated.length,
        lifecycle: lifeCount || 0,
        publishing: pubCount || 0,
      };
    } catch (err) {
      console.error('[SupabaseAutomationRepo] getQueueDepths error:', err);
      return {
        discovery: 0,
        extraction: 0,
        validation: 0,
        lifecycle: 0,
        publishing: 0,
      };
    }
  }

  async getOldestPendingAges(): Promise<Record<AutomationStage, number | null>> {
    const calcAgeMinutes = (dateStr?: string | null): number | null => {
      if (!dateStr) return null;
      const ms = Date.now() - new Date(dateStr).getTime();
      return Math.max(0, Math.floor(ms / (1000 * 60)));
    };

    try {
      // 1. Extraction oldest pending item within recency window
      const { data: extractionRows } = await this.client
        .from('news_extractions')
        .select('discovery_item_id, status, error_code, conflict_details');

      const maxRetries = getMaxExtractionRetries();
      const excludedDiscoveryIds = new Set<string>();
      for (const row of extractionRows || []) {
        if (row.status === 'completed' || row.status === 'needs_review') {
          excludedDiscoveryIds.add(row.discovery_item_id);
        } else if (row.status === 'failed') {
          const info = parseExtractionRetryInfo(row.conflict_details, row.error_code);
          if (!shouldRetryExtraction(info.attempts, row.error_code, maxRetries)) {
            excludedDiscoveryIds.add(row.discovery_item_id);
          }
        }
      }

      const recencyCutoff = getRecencyCutoffIso();
      const { data: activeDiscoveryItems } = await this.client
        .from('news_discovery_items')
        .select('id, published_at, discovered_at')
        .in('status', ['new', 'candidate'])
        .or(`published_at.gte.${recencyCutoff},and(published_at.is.null,discovered_at.gte.${recencyCutoff})`);

      const pendingDiscovery = (activeDiscoveryItems || []).filter(
        (d: any) => !excludedDiscoveryIds.has(d.id)
      );

      let extAgeMinutes: number | null = null;
      if (pendingDiscovery.length > 0) {
        const sorted = pendingDiscovery.sort((a: any, b: any) => {
          const timeA = new Date(a.published_at || a.discovered_at).getTime();
          const timeB = new Date(b.published_at || b.discovered_at).getTime();
          return timeA - timeB;
        });
        extAgeMinutes = calcAgeMinutes(sorted[0].published_at || sorted[0].discovered_at);
      }

      // 2. Validation oldest: completed extractions without a validation record
      const { data: completedExtractions } = await this.client
        .from('news_extractions')
        .select('id, created_at')
        .eq('status', 'completed');

      const { data: existingValidations } = await this.client
        .from('news_validations')
        .select('extraction_id');

      const validatedIds = new Set((existingValidations || []).map((v: any) => v.extraction_id));
      const unvalidated = (completedExtractions || []).filter(
        (e: any) => !validatedIds.has(e.id)
      );

      let valAgeMinutes: number | null = null;
      if (unvalidated.length > 0) {
        const sorted = unvalidated.sort(
          (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        valAgeMinutes = calcAgeMinutes(sorted[0].created_at);
      }

      // 3. Lifecycle oldest: valid validations
      const { data: lifeItem } = await this.client
        .from('news_validations')
        .select('created_at')
        .eq('status', 'valid')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      // 4. Publishing oldest: queued items
      const { data: pubItem } = await this.client
        .from('publication_queue')
        .select('created_at')
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      return {
        discovery: null,
        extraction: extAgeMinutes,
        validation: valAgeMinutes,
        lifecycle: calcAgeMinutes(lifeItem?.created_at),
        publishing: calcAgeMinutes(pubItem?.created_at),
      };
    } catch (err) {
      console.error('[SupabaseAutomationRepo] getOldestPendingAges error:', err);
      return {
        discovery: null,
        extraction: null,
        validation: null,
        lifecycle: null,
        publishing: null,
      };
    }
  }

  async recoverStaleRuns(maxAgeSeconds = 600): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - maxAgeSeconds * 1000).toISOString();
      const { data: stuckRuns, error } = await this.client
        .from('automation_runs')
        .select('id, started_at, errors')
        .eq('status', 'running')
        .lt('started_at', cutoff);

      if (error || !stuckRuns || stuckRuns.length === 0) return 0;

      const nowIso = new Date().toISOString();
      for (const run of stuckRuns) {
        const existingErrors = Array.isArray(run.errors) ? run.errors : [];
        await this.client
          .from('automation_runs')
          .update({
            status: 'failed',
            finished_at: nowIso,
            errors: [
              ...existingErrors,
              'ABORTED_RUN_AUTO_RECOVERED: Process was terminated by serverless execution limits.',
            ],
            metadata: { autoRecovered: true, recoveredAt: nowIso },
          })
          .eq('id', run.id);
      }
      return stuckRuns.length;
    } catch (err) {
      console.error('[SupabaseAutomationRepo] recoverStaleRuns error:', err);
      return 0;
    }
  }
}

