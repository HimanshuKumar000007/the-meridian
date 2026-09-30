/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * PipelineOrchestrator: Master Orchestration Engine for Pipeline Scheduling & Lifecycle
 */

import type {
  AutomationStage,
  AutomationTrigger,
  AutomationRunStatus,
  OrchestratorRunResult,
  StageRunResult,
  AutomationMetrics,
} from '../../types/automation';
import type { AutomationRepository } from '../../data/repositories/AutomationRepository';
import { AutomationLockService } from './AutomationLockService';
import { AutomationConfigService } from './AutomationConfigService';
import { StageRunnerService } from './StageRunnerService';
import { SchedulerCapabilityService } from './SchedulerCapabilityService';

export interface OrchestratorOptions {
  trigger?: AutomationTrigger;
  dryRun?: boolean;
  force?: boolean;
  stages?: AutomationStage[];
  limitOverride?: number;
  monitoringHook?: (result: OrchestratorRunResult) => Promise<void>;
}

export class PipelineOrchestrator {
  private lockService: AutomationLockService;
  private configService: AutomationConfigService;
  private capabilityService: SchedulerCapabilityService;
  private monitoringHook?: (result: OrchestratorRunResult) => Promise<void>;

  constructor(
    private repository: AutomationRepository,
    private stageRunner: StageRunnerService,
    options?: {
      lockService?: AutomationLockService;
      configService?: AutomationConfigService;
      capabilityService?: SchedulerCapabilityService;
      monitoringHook?: (result: OrchestratorRunResult) => Promise<void>;
    }
  ) {
    this.lockService = options?.lockService || new AutomationLockService(this.repository);
    this.configService = options?.configService || new AutomationConfigService();
    this.capabilityService = options?.capabilityService || new SchedulerCapabilityService();
    this.monitoringHook = options?.monitoringHook;
  }

  public getCapabilityService(): SchedulerCapabilityService {
    return this.capabilityService;
  }

  public getConfigService(): AutomationConfigService {
    return this.configService;
  }

  public getLockService(): AutomationLockService {
    return this.lockService;
  }

  /**
   * Run the master orchestration loop across eligible pipeline stages.
   */
  async orchestrate(options: OrchestratorOptions = {}): Promise<OrchestratorRunResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const runId = `run-orch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const trigger = options.trigger || 'cron';
    const isDryRun = Boolean(options.dryRun);
    const force = Boolean(options.force);
    const config = this.configService.getConfig();
    const planCapability = this.capabilityService.getCapabilities();

    const stageResults: Record<AutomationStage, StageRunResult | null> = {
      discovery: null,
      extraction: null,
      validation: null,
      lifecycle: null,
      publishing: null,
    };
    const errors: string[] = [];

    // 1. GLOBAL KILL SWITCH CHECK
    if (!config.enabled) {
      const durationMs = Date.now() - startTime;
      return {
        runId,
        trigger,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs,
        status: 'disabled',
        stageResults,
        isDryRun,
        lockAcquired: false,
        errors: ['AUTOMATION_DISABLED: Global automation kill switch is active.'],
        planCapability,
      };
    }

    // 2. ACQUIRE DISTRIBUTED RUN LOCK
    let lockAcquired = false;
    const lockName = 'master_orchestrator';

    if (!isDryRun) {
      const lockRes = await this.lockService.acquire(lockName, runId, config.lockTtlSeconds);
      if (!lockRes.acquired) {
        const durationMs = Date.now() - startTime;
        return {
          runId,
          trigger,
          startedAt,
          finishedAt: new Date().toISOString(),
          durationMs,
          status: 'skipped',
          stageResults,
          isDryRun,
          lockAcquired: false,
          errors: [
            `RUN_ALREADY_IN_PROGRESS: Lock '${lockName}' is currently held by owner ${lockRes.existingLock?.ownerId}.`,
          ],
          planCapability,
        };
      }
      lockAcquired = true;

      // Recover stale/aborted runs from previous serverless terminations
      try {
        await this.repository.recoverStaleRuns(config.lockTtlSeconds * 2);
      } catch (err: any) {
        console.error('[PipelineOrchestrator] Failed to recover stale runs:', err);
      }
    }

    // 3. RECORD RUN INITIALIZATION
    if (!isDryRun) {
      try {
        await this.repository.createRun({
          id: runId,
          runType: 'orchestrator',
          status: 'running',
          trigger,
          startedAt,
          metadata: { dryRun: isDryRun, force },
        });
      } catch (err: any) {
        console.error('[PipelineOrchestrator] Failed to record run creation:', err);
      }
    }


    try {
      // 4. FETCH STAGE SCHEDULES & QUEUE DEPTHS
      const [schedules, queueDepths, oldestPendingAges] = await Promise.all([
        this.repository.getSchedules(),
        this.repository.getQueueDepths(),
        this.repository.getOldestPendingAges(),
      ]);
      const scheduleMap = new Map(schedules.map((s) => [s.stage, s]));

      const pipelineStages: AutomationStage[] = [
        'discovery',
        'extraction',
        'validation',
        'lifecycle',
        'publishing',
      ];

      for (const stage of pipelineStages) {
        // If a stage filter is provided, skip stages not requested
        if (options.stages && options.stages.length > 0 && !options.stages.includes(stage)) {
          continue;
        }

        // Check Stage-level Kill Switch
        if (!config.stageEnabled[stage]) {
          stageResults[stage] = {
            stage,
            status: 'disabled',
            durationMs: 0,
            processed: 0,
            succeeded: 0,
            failed: 0,
            skipped: 0,
            remainingQueue: queueDepths[stage] || 0,
            errors: [`Stage '${stage}' is disabled by stage-level kill switch.`],
          };
          continue;
        }

        const schedule = scheduleMap.get(stage);
        const stageLimit = options.limitOverride || (schedule?.maxBatchSize ? schedule.maxBatchSize : config.maxBatch[stage]);

        // Check overall serverless execution budget (48 seconds max from orchestrator start)
        const elapsedSinceStart = Date.now() - startTime;
        const SERVERLESS_EXECUTION_BUDGET_MS = 48000;
        if (elapsedSinceStart >= SERVERLESS_EXECUTION_BUDGET_MS) {
          stageResults[stage] = {
            stage,
            status: 'skipped',
            durationMs: 0,
            processed: 0,
            succeeded: 0,
            failed: 0,
            skipped: 0,
            remainingQueue: queueDepths[stage] || 0,
            errors: [],
            metadata: { reason: 'Stage deferred to next scheduled cycle due to serverless execution time budget.' },
          };
          continue;
        }

        // Check whether stage is due (or forced)
        let isDue = force;
        if (!isDue) {
          if (!schedule || !schedule.lastRunAt) {
            isDue = true;
          } else {
            const nextDueTime = schedule.nextDueAt ? new Date(schedule.nextDueAt).getTime() : 0;
            const targetIntervalMs = (schedule.targetIntervalMinutes || 10) * 60 * 1000;
            const elapsed = Date.now() - new Date(schedule.lastRunAt).getTime();
            const CLOCK_SKEW_GRACE_MS = 60 * 1000; // 60s tolerance for scheduled cron jitter

            if (nextDueTime > 0 && Date.now() >= nextDueTime - CLOCK_SKEW_GRACE_MS) {
              isDue = true;
            } else if (elapsed >= targetIntervalMs - CLOCK_SKEW_GRACE_MS) {
              isDue = true;
            } else if (stage !== 'discovery' && (queueDepths[stage] || 0) > 0) {
              // Backlog exists - eligible to process
              isDue = true;
            }
          }
        }

        if (!isDue) {
          stageResults[stage] = {
            stage,
            status: 'skipped',
            durationMs: 0,
            processed: 0,
            succeeded: 0,
            failed: 0,
            skipped: 0,
            remainingQueue: queueDepths[stage] || 0,
            errors: [],
            metadata: { reason: 'Stage not due according to schedule cadence.' },
          };
          continue;
        }

        // 5. RUN STAGE
        const result = await this.stageRunner.runStage(stage, {
          limit: stageLimit,
          dryRun: isDryRun,
          force,
        });

        stageResults[stage] = result;
        if (result.errors.length > 0) {
          errors.push(...result.errors.map((e) => `[${stage}] ${e}`));
        }

        // 6. UPDATE SCHEDULE METADATA
        if (!isDryRun && schedule) {
          const nowIso = new Date().toISOString();
          const targetIntervalMs = (schedule.targetIntervalMinutes || 10) * 60 * 1000;
          const nextDueAt = new Date(Date.now() + targetIntervalMs).toISOString();

          const updates: any = {
            lastRunAt: nowIso,
            nextDueAt,
          };

          if (result.status === 'completed' || (result.status === 'partial' && result.succeeded > 0)) {
            updates.lastSuccessAt = nowIso;
            updates.consecutiveFailures = 0;
          } else if (result.status === 'failed' || (result.status === 'partial' && result.succeeded === 0)) {
            updates.lastFailureAt = nowIso;
            updates.consecutiveFailures = (schedule.consecutiveFailures || 0) + 1;
          }


          try {
            await this.repository.updateSchedule(stage, updates);
            await this.repository.recordEvent({
              runId,
              stage,
              eventType: `STAGE_${result.status.toUpperCase()}`,
              severity: result.status === 'failed' ? 'error' : result.status === 'partial' ? 'warn' : 'info',
              message: `Stage '${stage}' executed with status '${result.status}' (processed: ${result.processed}, succeeded: ${result.succeeded}, failed: ${result.failed}).`,
              metadata: { durationMs: result.durationMs, errors: result.errors },
            });
          } catch (schedErr) {
            console.error(`[PipelineOrchestrator] Failed to update schedule for ${stage}:`, schedErr);
          }
        }
      }

      // Compute overall status
      const executedStages = Object.values(stageResults).filter((r): r is StageRunResult => r !== null);
      let overallStatus: AutomationRunStatus = 'completed';

      const hasFailures = executedStages.some((r) => r.status === 'failed');
      const hasPartials = executedStages.some((r) => r.status === 'partial');
      const hasSuccesses = executedStages.some((r) => r.status === 'completed' && r.processed > 0);
      const allSkipped = executedStages.every((r) => r.status === 'skipped' || r.status === 'disabled');

      if (hasFailures && hasSuccesses) {
        overallStatus = 'partial';
      } else if (hasFailures) {
        overallStatus = 'failed';
      } else if (hasPartials) {
        overallStatus = 'partial';
      } else if (allSkipped) {
        overallStatus = 'skipped';
      } else {
        overallStatus = 'completed';
      }

      const durationMs = Date.now() - startTime;
      const finishedAt = new Date().toISOString();

      // Aggregate metrics
      const metrics: AutomationMetrics = {
        discoveryToExtractionCount: queueDepths.extraction || 0,
        extractionToValidationCount: queueDepths.validation || 0,
        validationToLifecycleCount: queueDepths.lifecycle || 0,
        lifecycleToPublicationCount: queueDepths.publishing || 0,
        queueDepths,
        oldestPendingAgeMinutes: oldestPendingAges,
      };

      // 7. RECORD FINAL RUN STATUS
      if (!isDryRun) {
        try {
          const totalProcessed = executedStages.reduce((sum, r) => sum + r.processed, 0);
          const totalSucceeded = executedStages.reduce((sum, r) => sum + r.succeeded, 0);
          const totalFailed = executedStages.reduce((sum, r) => sum + r.failed, 0);
          const totalSkipped = executedStages.reduce((sum, r) => sum + r.skipped, 0);

          await this.repository.updateRun(runId, {
            status: overallStatus,
            finishedAt,
            durationMs,
            processed: totalProcessed,
            succeeded: totalSucceeded,
            failed: totalFailed,
            skipped: totalSkipped,
            errors,
            metadata: {
              metrics,
              stageResults,
            },
          });
        } catch (err: any) {
          console.error('[PipelineOrchestrator] Failed to update final run status:', err);
        }
      }

      const runResult: OrchestratorRunResult = {
        runId,
        trigger,
        startedAt,
        finishedAt,
        durationMs,
        status: overallStatus,
        stageResults,
        isDryRun,
        lockAcquired,
        errors,
        metrics,
        planCapability,
      };

      const hookToRun = options.monitoringHook || this.monitoringHook;
      if (!isDryRun && hookToRun && (Date.now() - startTime < 50000)) {
        try {
          await hookToRun(runResult);
        } catch (hookErr) {
          console.warn('[PipelineOrchestrator] Non-fatal monitoring hook error:', hookErr);
        }
      }

      return runResult;
    } finally {
      // 8. ALWAYS RELEASE LOCK
      if (lockAcquired) {
        try {
          await this.lockService.release(lockName, runId);
        } catch (err) {
          console.error('[PipelineOrchestrator] Failed to release lock:', err);
        }
      }
    }
  }
}
