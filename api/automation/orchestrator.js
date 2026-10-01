var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/services/automation/PipelineOrchestrator.ts
var PipelineOrchestrator_exports = {};
__export(PipelineOrchestrator_exports, {
  PipelineOrchestrator: () => PipelineOrchestrator
});
module.exports = __toCommonJS(PipelineOrchestrator_exports);

// src/services/automation/AutomationLockService.ts
var AutomationLockService = class {
  constructor(repository) {
    this.repository = repository;
  }
  /**
   * Attempts to acquire an execution lock with the given TTL in seconds.
   * If a prior lock exists but has expired, it safely reclaims the lock.
   */
  async acquire(lockName, ownerId, ttlSeconds = 300) {
    const lock = await this.repository.getLock(lockName);
    if (lock) {
      const isExpired = new Date(lock.expiresAt).getTime() <= Date.now();
      if (!isExpired && lock.ownerId !== ownerId) {
        return { acquired: false, existingLock: lock };
      }
    }
    const acquired = await this.repository.acquireLock(lockName, ownerId, ttlSeconds);
    return { acquired, existingLock: lock };
  }
  /**
   * Releases an execution lock if owned by ownerId.
   */
  async release(lockName, ownerId) {
    return this.repository.releaseLock(lockName, ownerId);
  }
  /**
   * Inspect current lock state.
   */
  async inspect(lockName) {
    return this.repository.getLock(lockName);
  }
  /**
   * Check if a lock is currently active and unexpired.
   */
  async isLocked(lockName) {
    const lock = await this.repository.getLock(lockName);
    if (!lock) return false;
    return new Date(lock.expiresAt).getTime() > Date.now();
  }
};

// src/services/automation/AutomationConfigService.ts
var AutomationConfigService = class {
  parseBool(val, defaultVal = true) {
    if (val === void 0 || val === "") return defaultVal;
    const lower = val.trim().toLowerCase();
    return lower === "true" || lower === "1" || lower === "yes";
  }
  parseInt(val, defaultVal, min = 1, max = 50) {
    if (!val) return defaultVal;
    const num = parseInt(val, 10);
    if (isNaN(num)) return defaultVal;
    return Math.max(min, Math.min(num, max));
  }
  getConfig() {
    const globalEnabled = this.parseBool(process.env.AUTOMATION_ENABLED, true);
    const globalMaxBatch = this.parseInt(process.env.AUTOMATION_MAX_BATCH, 5);
    return {
      enabled: globalEnabled,
      cronSecret: process.env.CRON_SECRET || process.env.AUTOMATION_CRON_SECRET,
      lockTtlSeconds: this.parseInt(process.env.AUTOMATION_LOCK_TTL_SECONDS, 300, 30, 3600),
      // 5 min default
      stageEnabled: {
        discovery: globalEnabled && this.parseBool(process.env.AUTOMATION_DISCOVERY_ENABLED, true),
        extraction: globalEnabled && this.parseBool(process.env.AUTOMATION_EXTRACTION_ENABLED, true),
        validation: globalEnabled && this.parseBool(process.env.AUTOMATION_VALIDATION_ENABLED, true),
        lifecycle: globalEnabled && this.parseBool(process.env.AUTOMATION_LIFECYCLE_ENABLED, true),
        publishing: globalEnabled && this.parseBool(process.env.AUTOMATION_PUBLISHING_ENABLED, true)
      },
      maxBatch: {
        discovery: this.parseInt(process.env.DISCOVERY_MAX_BATCH, globalMaxBatch),
        extraction: this.parseInt(process.env.EXTRACTION_MAX_BATCH, 2),
        validation: this.parseInt(process.env.VALIDATION_MAX_BATCH, 10),
        lifecycle: this.parseInt(process.env.LIFECYCLE_MAX_BATCH, 10),
        publishing: this.parseInt(process.env.PUBLISHING_MAX_BATCH, 5)
      },
      targetIntervals: {
        discovery: this.parseInt(process.env.DISCOVERY_INTERVAL_MINUTES, 60, 5, 1440),
        extraction: this.parseInt(process.env.EXTRACTION_INTERVAL_MINUTES, 10, 1, 1440),
        validation: this.parseInt(process.env.VALIDATION_INTERVAL_MINUTES, 10, 1, 1440),
        lifecycle: this.parseInt(process.env.LIFECYCLE_INTERVAL_MINUTES, 10, 1, 1440),
        publishing: this.parseInt(process.env.PUBLISHING_INTERVAL_MINUTES, 10, 1, 1440)
      }
    };
  }
  /**
   * Validates server-to-server request authentication.
   * Returns true if authorized, false otherwise.
   */
  verifyAuthHeader(authHeader, customSecretHeader) {
    const expectedSecret = process.env.AUTOMATION_CRON_SECRET || process.env.CRON_SECRET;
    if (!expectedSecret || expectedSecret.trim() === "") {
      return false;
    }
    const bearerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : void 0;
    const provided = bearerToken || (customSecretHeader ? customSecretHeader.trim() : void 0);
    if (!provided || provided === "") {
      return false;
    }
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey && serviceRoleKey.trim() !== "" && provided === serviceRoleKey.trim()) {
      return false;
    }
    return provided === expectedSecret.trim();
  }
};

// src/services/automation/SchedulerCapabilityService.ts
var SchedulerCapabilityService = class {
  /**
   * Detect deployment environment and evaluate scheduler capabilities.
   */
  getCapabilities(options) {
    const requestedInterval = options?.requestedIntervalMinutes ?? 10;
    const envPlan = (process.env.VERCEL_PLAN || "hobby").toLowerCase();
    const isProOrEnterprise = envPlan === "pro" || envPlan === "enterprise";
    const plan = isProOrEnterprise ? envPlan : "hobby";
    const supportsDaily = true;
    const supportsHourly = isProOrEnterprise;
    const supportsMinuteLevel = isProOrEnterprise;
    const minIntervalMinutes = isProOrEnterprise ? 1 : 1440;
    const configuredCronSchedule = isProOrEnterprise ? "*/10 * * * *" : "0 6 * * *";
    const activeCadenceDescription = isProOrEnterprise ? "Minute-level / sub-hourly cron active (every 10 minutes)" : "Daily cron supported on Vercel Hobby (0 6 * * * / once every 24 hours)";
    const targetCadenceDescription = "Target Cadence: Discovery every 60 min, Extraction/Validation/Lifecycle/Publishing every 10 min";
    const canDeliverTargetCadence = isProOrEnterprise || requestedInterval >= minIntervalMinutes;
    let status = "SCHEDULE_AVAILABLE";
    let reason = "Platform scheduling capabilities match or exceed requested cadence.";
    if (!canDeliverTargetCadence) {
      status = "SCHEDULE_UNAVAILABLE";
      reason = `Current Vercel plan is "${plan.toUpperCase()}", which enforces a strict maximum cron execution frequency of once per day (1440 minutes). The target interval of ${requestedInterval} minutes cannot be natively registered in Vercel Cron without violating platform constraints.`;
    }
    const upgradeOrExternalAlternative = "To achieve target 10-minute cadence natively on Vercel, upgrade to Vercel Pro. Alternatively, trigger the secure POST /api/automation/orchestrator endpoint at any cadence using GitHub Actions, Supabase pg_cron, or an external webhook caller with CRON_SECRET.";
    return {
      plan,
      supportsDaily,
      supportsHourly,
      supportsMinuteLevel,
      minIntervalMinutes,
      configuredCronSchedule,
      activeCadenceDescription,
      targetCadenceDescription,
      canDeliverTargetCadence,
      status,
      reason,
      externalSchedulerSupported: true,
      upgradeOrExternalAlternative
    };
  }
};

// src/services/automation/PipelineOrchestrator.ts
var PipelineOrchestrator = class {
  constructor(repository, stageRunner, options) {
    this.repository = repository;
    this.stageRunner = stageRunner;
    this.lockService = options?.lockService || new AutomationLockService(this.repository);
    this.configService = options?.configService || new AutomationConfigService();
    this.capabilityService = options?.capabilityService || new SchedulerCapabilityService();
    this.monitoringHook = options?.monitoringHook;
  }
  getCapabilityService() {
    return this.capabilityService;
  }
  getConfigService() {
    return this.configService;
  }
  getLockService() {
    return this.lockService;
  }
  /**
   * Run the master orchestration loop across eligible pipeline stages.
   */
  async orchestrate(options = {}) {
    const startedAt = (/* @__PURE__ */ new Date()).toISOString();
    const startTime = Date.now();
    const runId = `run-orch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const trigger = options.trigger || "cron";
    const isDryRun = Boolean(options.dryRun);
    const force = Boolean(options.force);
    const config = this.configService.getConfig();
    const planCapability = this.capabilityService.getCapabilities();
    const stageResults = {
      discovery: null,
      extraction: null,
      validation: null,
      lifecycle: null,
      publishing: null
    };
    const errors = [];
    if (!config.enabled) {
      const durationMs = Date.now() - startTime;
      return {
        runId,
        trigger,
        startedAt,
        finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
        durationMs,
        status: "disabled",
        stageResults,
        isDryRun,
        lockAcquired: false,
        errors: ["AUTOMATION_DISABLED: Global automation kill switch is active."],
        planCapability
      };
    }
    let lockAcquired = false;
    const lockName = "master_orchestrator";
    if (!isDryRun) {
      const lockRes = await this.lockService.acquire(lockName, runId, config.lockTtlSeconds);
      if (!lockRes.acquired) {
        const durationMs = Date.now() - startTime;
        return {
          runId,
          trigger,
          startedAt,
          finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
          durationMs,
          status: "skipped",
          stageResults,
          isDryRun,
          lockAcquired: false,
          errors: [
            `RUN_ALREADY_IN_PROGRESS: Lock '${lockName}' is currently held by owner ${lockRes.existingLock?.ownerId}.`
          ],
          planCapability
        };
      }
      lockAcquired = true;
      try {
        await this.repository.recoverStaleRuns(config.lockTtlSeconds * 2);
      } catch (err) {
        console.error("[PipelineOrchestrator] Failed to recover stale runs:", err);
      }
    }
    if (!isDryRun) {
      try {
        await this.repository.createRun({
          id: runId,
          runType: "orchestrator",
          status: "running",
          trigger,
          startedAt,
          metadata: { dryRun: isDryRun, force }
        });
      } catch (err) {
        console.error("[PipelineOrchestrator] Failed to record run creation:", err);
      }
    }
    try {
      const [schedules, queueDepths, oldestPendingAges] = await Promise.all([
        this.repository.getSchedules(),
        this.repository.getQueueDepths(),
        this.repository.getOldestPendingAges()
      ]);
      const scheduleMap = new Map(schedules.map((s) => [s.stage, s]));
      const pipelineStages = [
        "discovery",
        "extraction",
        "validation",
        "lifecycle",
        "publishing"
      ];
      for (const stage of pipelineStages) {
        if (options.stages && options.stages.length > 0 && !options.stages.includes(stage)) {
          continue;
        }
        if (!config.stageEnabled[stage]) {
          stageResults[stage] = {
            stage,
            status: "disabled",
            durationMs: 0,
            processed: 0,
            succeeded: 0,
            failed: 0,
            skipped: 0,
            remainingQueue: queueDepths[stage] || 0,
            errors: [`Stage '${stage}' is disabled by stage-level kill switch.`]
          };
          continue;
        }
        const schedule = scheduleMap.get(stage);
        const stageLimit = options.limitOverride || (schedule?.maxBatchSize ? schedule.maxBatchSize : config.maxBatch[stage]);
        const elapsedSinceStart = Date.now() - startTime;
        const SERVERLESS_EXECUTION_BUDGET_MS = 1e5;
        if (elapsedSinceStart >= SERVERLESS_EXECUTION_BUDGET_MS) {
          stageResults[stage] = {
            stage,
            status: "skipped",
            durationMs: 0,
            processed: 0,
            succeeded: 0,
            failed: 0,
            skipped: 0,
            remainingQueue: queueDepths[stage] || 0,
            errors: [],
            metadata: { reason: "Stage deferred to next scheduled cycle due to serverless execution time budget." }
          };
          continue;
        }
        let isDue = force;
        if (!isDue) {
          if (!schedule || !schedule.lastRunAt) {
            isDue = true;
          } else {
            const nextDueTime = schedule.nextDueAt ? new Date(schedule.nextDueAt).getTime() : 0;
            const targetIntervalMs = (schedule.targetIntervalMinutes || 10) * 60 * 1e3;
            const elapsed = Date.now() - new Date(schedule.lastRunAt).getTime();
            const CLOCK_SKEW_GRACE_MS = 60 * 1e3;
            if (nextDueTime > 0 && Date.now() >= nextDueTime - CLOCK_SKEW_GRACE_MS) {
              isDue = true;
            } else if (elapsed >= targetIntervalMs - CLOCK_SKEW_GRACE_MS) {
              isDue = true;
            } else if (stage !== "discovery" && (queueDepths[stage] || 0) > 0) {
              isDue = true;
            }
          }
        }
        if (!isDue) {
          stageResults[stage] = {
            stage,
            status: "skipped",
            durationMs: 0,
            processed: 0,
            succeeded: 0,
            failed: 0,
            skipped: 0,
            remainingQueue: queueDepths[stage] || 0,
            errors: [],
            metadata: { reason: "Stage not due according to schedule cadence." }
          };
          continue;
        }
        const result = await this.stageRunner.runStage(stage, {
          limit: stageLimit,
          dryRun: isDryRun,
          force
        });
        stageResults[stage] = result;
        if (result.errors.length > 0) {
          errors.push(...result.errors.map((e) => `[${stage}] ${e}`));
        }
        if (!isDryRun && schedule) {
          const nowIso = (/* @__PURE__ */ new Date()).toISOString();
          const targetIntervalMs = (schedule.targetIntervalMinutes || 10) * 60 * 1e3;
          const nextDueAt = new Date(Date.now() + targetIntervalMs).toISOString();
          const updates = {
            lastRunAt: nowIso,
            nextDueAt
          };
          if (result.status === "completed" || result.status === "partial" && result.succeeded > 0) {
            updates.lastSuccessAt = nowIso;
            updates.consecutiveFailures = 0;
          } else if (result.status === "failed" || result.status === "partial" && result.succeeded === 0) {
            updates.lastFailureAt = nowIso;
            updates.consecutiveFailures = (schedule.consecutiveFailures || 0) + 1;
          }
          try {
            await this.repository.updateSchedule(stage, updates);
            await this.repository.recordEvent({
              runId,
              stage,
              eventType: `STAGE_${result.status.toUpperCase()}`,
              severity: result.status === "failed" ? "error" : result.status === "partial" ? "warn" : "info",
              message: `Stage '${stage}' executed with status '${result.status}' (processed: ${result.processed}, succeeded: ${result.succeeded}, failed: ${result.failed}).`,
              metadata: { durationMs: result.durationMs, errors: result.errors }
            });
          } catch (schedErr) {
            console.error(`[PipelineOrchestrator] Failed to update schedule for ${stage}:`, schedErr);
          }
        }
      }
      const executedStages = Object.values(stageResults).filter((r) => r !== null);
      let overallStatus = "completed";
      const hasFailures = executedStages.some((r) => r.status === "failed");
      const hasPartials = executedStages.some((r) => r.status === "partial");
      const hasSuccesses = executedStages.some((r) => r.status === "completed" && r.processed > 0);
      const allSkipped = executedStages.every((r) => r.status === "skipped" || r.status === "disabled");
      if (hasFailures && hasSuccesses) {
        overallStatus = "partial";
      } else if (hasFailures) {
        overallStatus = "failed";
      } else if (hasPartials) {
        overallStatus = "partial";
      } else if (allSkipped) {
        overallStatus = "skipped";
      } else {
        overallStatus = "completed";
      }
      const durationMs = Date.now() - startTime;
      const finishedAt = (/* @__PURE__ */ new Date()).toISOString();
      const metrics = {
        discoveryToExtractionCount: queueDepths.extraction || 0,
        extractionToValidationCount: queueDepths.validation || 0,
        validationToLifecycleCount: queueDepths.lifecycle || 0,
        lifecycleToPublicationCount: queueDepths.publishing || 0,
        queueDepths,
        oldestPendingAgeMinutes: oldestPendingAges
      };
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
              stageResults
            }
          });
        } catch (err) {
          console.error("[PipelineOrchestrator] Failed to update final run status:", err);
        }
      }
      const runResult = {
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
        planCapability
      };
      const hookToRun = options.monitoringHook || this.monitoringHook;
      if (!isDryRun && hookToRun && Date.now() - startTime < 11e4) {
        try {
          await hookToRun(runResult);
        } catch (hookErr) {
          console.warn("[PipelineOrchestrator] Non-fatal monitoring hook error:", hookErr);
        }
      }
      return runResult;
    } finally {
      if (lockAcquired) {
        try {
          await this.lockService.release(lockName, runId);
        } catch (err) {
          console.error("[PipelineOrchestrator] Failed to release lock:", err);
        }
      }
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PipelineOrchestrator
});
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * AutomationLockService: Distributed Run Lock with Auto-Expiration & Stale Recovery
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * AutomationConfigService: Configuration, Environment, Kill Switches, and Auth Verification
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * SchedulerCapabilityService: Plan-Aware Scheduling & Platform Capability Detection
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * PipelineOrchestrator: Master Orchestration Engine for Pipeline Scheduling & Lifecycle
 */
