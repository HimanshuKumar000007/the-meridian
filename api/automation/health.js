// src/api/health.ts
import { createClient } from "@supabase/supabase-js";

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
        extraction: this.parseInt(process.env.EXTRACTION_MAX_BATCH, 5),
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

// src/services/automation/AutomationHealthService.ts
var AutomationHealthService = class {
  constructor(repository, configService) {
    this.repository = repository;
    this.configService = configService || new AutomationConfigService();
  }
  async getHealth() {
    const config = this.configService.getConfig();
    const schedules = await this.repository.getSchedules();
    const scheduleMap = new Map(schedules.map((s) => [s.stage, s]));
    const queueDepths = await this.repository.getQueueDepths();
    const oldestPendingAges = await this.repository.getOldestPendingAges();
    const recentRuns = await this.repository.getRecentRuns(5);
    const lock = await this.repository.getLock("master_orchestrator");
    const isLockActive = Boolean(lock && new Date(lock.expiresAt).getTime() > Date.now());
    const isLockStale = Boolean(lock && new Date(lock.expiresAt).getTime() <= Date.now());
    const stages = [
      "discovery",
      "extraction",
      "validation",
      "lifecycle",
      "publishing"
    ];
    const alerts = [];
    const stageReports = [];
    if (!config.enabled) {
      alerts.push("GLOBAL_KILL_SWITCH_ACTIVE: Automation is currently disabled.");
    }
    if (isLockStale) {
      alerts.push(`STALE_LOCK_DETECTED: Lock held by ${lock?.ownerId} has expired and will be auto-recovered.`);
    }
    let overallState = config.enabled ? "healthy" : "disabled";
    for (const stage of stages) {
      const schedule = scheduleMap.get(stage);
      const isEnabled = config.stageEnabled[stage];
      const failures = schedule?.consecutiveFailures || 0;
      const depth = queueDepths[stage] || 0;
      const ageMinutes = oldestPendingAges[stage] || null;
      const intervalMinutes = schedule?.targetIntervalMinutes || 10;
      let stageHealth = "healthy";
      if (!isEnabled) {
        stageHealth = "disabled";
      } else if (failures >= 3) {
        stageHealth = "failed";
        alerts.push(`STAGE_FAILURES: Stage '${stage}' has failed ${failures} consecutive times.`);
      } else if (failures > 0) {
        stageHealth = "degraded";
      } else if (schedule?.lastSuccessAt) {
        const elapsedMinutes = Math.floor(
          (Date.now() - new Date(schedule.lastSuccessAt).getTime()) / (1e3 * 60)
        );
        if (elapsedMinutes > intervalMinutes * 3) {
          stageHealth = "stale";
          alerts.push(`STAGE_STALE: Stage '${stage}' has had no successful run in ${elapsedMinutes} minutes.`);
        }
      }
      if (depth > 200) {
        alerts.push(`HIGH_BACKLOG_WARNING: Stage '${stage}' queue depth is high (${depth} items).`);
      }
      stageReports.push({
        stage,
        enabled: isEnabled,
        healthState: stageHealth,
        lastRunAt: schedule?.lastRunAt || null,
        lastSuccessAt: schedule?.lastSuccessAt || null,
        lastFailureAt: schedule?.lastFailureAt || null,
        consecutiveFailures: failures,
        queueDepth: depth,
        oldestPendingAgeMinutes: ageMinutes,
        targetIntervalMinutes: intervalMinutes
      });
    }
    if (stageReports.some((s) => s.healthState === "failed")) {
      overallState = "failed";
    } else if (stageReports.some((s) => s.healthState === "degraded" || s.healthState === "stale")) {
      overallState = "degraded";
    } else if (!config.enabled) {
      overallState = "disabled";
    } else {
      overallState = "healthy";
    }
    return {
      overallState,
      globalEnabled: config.enabled,
      activeLock: isLockActive,
      lockOwner: lock?.ownerId || null,
      lockExpiresAt: lock?.expiresAt || null,
      queueDepths,
      oldestPendingAges,
      stageReports,
      alerts,
      recentRuns
    };
  }
};

// src/data/repositories/SupabaseAutomationRepository.ts
var SupabaseAutomationRepository = class {
  constructor(client) {
    this.client = client;
  }
  async acquireLock(lockName, ownerId, ttlSeconds) {
    const now = /* @__PURE__ */ new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1e3);
    const { data: lock, error: fetchErr } = await this.client.from("automation_locks").select("*").eq("lock_name", lockName).maybeSingle();
    if (fetchErr) {
      console.error("[SupabaseAutomationRepo] acquireLock fetch error:", fetchErr);
      return false;
    }
    if (!lock) {
      const { error: insertErr } = await this.client.from("automation_locks").insert({
        lock_name: lockName,
        owner_id: ownerId,
        acquired_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        metadata: { initial_ttl_sec: ttlSeconds }
      });
      if (insertErr) {
        return false;
      }
      return true;
    }
    const isExpired = new Date(lock.expires_at).getTime() <= now.getTime();
    if (isExpired || lock.owner_id === ownerId) {
      const { error: updateErr } = await this.client.from("automation_locks").update({
        owner_id: ownerId,
        acquired_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        metadata: {
          ...lock.metadata,
          recovered_at: now.toISOString(),
          previous_owner: lock.owner_id
        }
      }).eq("lock_name", lockName);
      return !updateErr;
    }
    return false;
  }
  async releaseLock(lockName, ownerId) {
    const { error } = await this.client.from("automation_locks").delete().eq("lock_name", lockName).eq("owner_id", ownerId);
    if (error) {
      console.error("[SupabaseAutomationRepo] releaseLock error:", error);
      return false;
    }
    return true;
  }
  async getLock(lockName) {
    const { data, error } = await this.client.from("automation_locks").select("*").eq("lock_name", lockName).maybeSingle();
    if (error || !data) return null;
    return {
      lockName: data.lock_name,
      ownerId: data.owner_id,
      acquiredAt: data.acquired_at,
      expiresAt: data.expires_at,
      metadata: data.metadata || {}
    };
  }
  async createRun(run) {
    const id = run.id || `run-orch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const row = {
      id,
      run_type: run.runType || "orchestrator",
      status: run.status || "running",
      trigger: run.trigger || "cron",
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
      created_at: now
    };
    const { data, error } = await this.client.from("automation_runs").insert(row).select().single();
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
      createdAt: data.created_at
    };
  }
  async updateRun(id, updates) {
    const patch = {};
    if (updates.status !== void 0) patch.status = updates.status;
    if (updates.finishedAt !== void 0) patch.finished_at = updates.finishedAt;
    if (updates.durationMs !== void 0) patch.duration_ms = updates.durationMs;
    if (updates.sources !== void 0) patch.sources = updates.sources;
    if (updates.processed !== void 0) patch.processed = updates.processed;
    if (updates.succeeded !== void 0) patch.succeeded = updates.succeeded;
    if (updates.failed !== void 0) patch.failed = updates.failed;
    if (updates.skipped !== void 0) patch.skipped = updates.skipped;
    if (updates.errors !== void 0) patch.errors = updates.errors;
    if (updates.metadata !== void 0) patch.metadata = updates.metadata;
    const { data, error } = await this.client.from("automation_runs").update(patch).eq("id", id).select().single();
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
      createdAt: data.created_at
    };
  }
  async recordEvent(event) {
    const id = event.id || `evt-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const row = {
      id,
      run_id: event.runId || null,
      stage: event.stage || "orchestrator",
      event_type: event.eventType || "INFO",
      severity: event.severity || "info",
      message: event.message || "",
      metadata: event.metadata || {},
      created_at: now
    };
    const { data, error } = await this.client.from("automation_events").insert(row).select().single();
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
      createdAt: data.created_at
    };
  }
  async getSchedules() {
    const { data, error } = await this.client.from("automation_schedules").select("*").order("stage", { ascending: true });
    if (error || !data) {
      throw new Error(`Failed to fetch automation schedules: ${error?.message}`);
    }
    return data.map((row) => ({
      stage: row.stage,
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
      metadata: row.metadata || {}
    }));
  }
  async updateSchedule(stage, updates) {
    const patch = {
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (updates.enabled !== void 0) patch.enabled = updates.enabled;
    if (updates.targetIntervalMinutes !== void 0) {
      patch.target_interval_minutes = updates.targetIntervalMinutes;
    }
    if (updates.maxBatchSize !== void 0) {
      patch.max_batch_size = updates.maxBatchSize;
    }
    if (updates.lastRunAt !== void 0) patch.last_run_at = updates.lastRunAt;
    if (updates.lastSuccessAt !== void 0) patch.last_success_at = updates.lastSuccessAt;
    if (updates.lastFailureAt !== void 0) patch.last_failure_at = updates.lastFailureAt;
    if (updates.nextDueAt !== void 0) patch.next_due_at = updates.nextDueAt;
    if (updates.consecutiveFailures !== void 0) {
      patch.consecutive_failures = updates.consecutiveFailures;
    }
    if (updates.metadata !== void 0) patch.metadata = updates.metadata;
    const { data, error } = await this.client.from("automation_schedules").update(patch).eq("stage", stage).select().single();
    if (error || !data) {
      throw new Error(`Failed to update schedule for stage ${stage}: ${error?.message}`);
    }
    return {
      stage: data.stage,
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
      metadata: data.metadata || {}
    };
  }
  async getRecentRuns(limit = 10) {
    const { data, error } = await this.client.from("automation_runs").select("*").order("started_at", { ascending: false }).limit(limit);
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
      createdAt: row.created_at
    }));
  }
  async getQueueDepths() {
    try {
      const { count: discCount } = await this.client.from("news_sources").select("*", { count: "exact", head: true }).eq("is_active", true);
      const { count: extCount } = await this.client.from("news_discovery_items").select("*", { count: "exact", head: true }).eq("status", "new");
      const { count: valCount } = await this.client.from("news_extractions").select("*", { count: "exact", head: true }).eq("status", "completed");
      const { count: lifeCount } = await this.client.from("news_validations").select("*", { count: "exact", head: true }).eq("status", "valid");
      const { count: pubCount } = await this.client.from("publication_queue").select("*", { count: "exact", head: true }).eq("status", "queued");
      return {
        discovery: discCount || 0,
        extraction: extCount || 0,
        validation: valCount || 0,
        lifecycle: lifeCount || 0,
        publishing: pubCount || 0
      };
    } catch (err) {
      console.error("[SupabaseAutomationRepo] getQueueDepths error:", err);
      return {
        discovery: 0,
        extraction: 0,
        validation: 0,
        lifecycle: 0,
        publishing: 0
      };
    }
  }
  async getOldestPendingAges() {
    const calcAgeMinutes = (dateStr) => {
      if (!dateStr) return null;
      const ms = Date.now() - new Date(dateStr).getTime();
      return Math.max(0, Math.floor(ms / (1e3 * 60)));
    };
    try {
      const { data: extItem } = await this.client.from("news_discovery_items").select("discovered_at").eq("status", "new").order("discovered_at", { ascending: true }).limit(1).maybeSingle();
      const { data: valItem } = await this.client.from("news_extractions").select("created_at").eq("status", "completed").order("created_at", { ascending: true }).limit(1).maybeSingle();
      const { data: lifeItem } = await this.client.from("news_validations").select("created_at").eq("status", "valid").order("created_at", { ascending: true }).limit(1).maybeSingle();
      const { data: pubItem } = await this.client.from("publication_queue").select("created_at").eq("status", "queued").order("created_at", { ascending: true }).limit(1).maybeSingle();
      return {
        discovery: null,
        extraction: calcAgeMinutes(extItem?.discovered_at),
        validation: calcAgeMinutes(valItem?.created_at),
        lifecycle: calcAgeMinutes(lifeItem?.created_at),
        publishing: calcAgeMinutes(pubItem?.created_at)
      };
    } catch (err) {
      console.error("[SupabaseAutomationRepo] getOldestPendingAges error:", err);
      return {
        discovery: null,
        extraction: null,
        validation: null,
        lifecycle: null,
        publishing: null
      };
    }
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

// src/api/health.ts
async function handler(req, res) {
  const configService = new AutomationConfigService();
  const authHeader = req.headers["authorization"];
  const customHeader = req.headers["x-cron-secret"] || req.headers["x-admin-secret"];
  if (!configService.verifyAuthHeader(authHeader, customHeader)) {
    return res.status(401).json({ error: "Unauthorized: Access restricted to authorized operators." });
  }
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://dzbggkymgdtsyvrvrrjw.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return res.status(500).json({ error: "Server Configuration Error: Missing SUPABASE_SERVICE_ROLE_KEY." });
  }
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });
    const repository = new SupabaseAutomationRepository(supabase);
    const healthService = new AutomationHealthService(repository, configService);
    const capabilityService = new SchedulerCapabilityService();
    const health = await healthService.getHealth();
    const capabilities = capabilityService.getCapabilities();
    return res.status(200).json({
      success: true,
      health,
      capabilities
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
export {
  handler as default
};
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
 * AutomationHealthService: Health State, Queue Metrics, Backlog Age, and Incident Detection
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * SupabaseAutomationRepository (Production Implementation)
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
 * Vercel Serverless Function: /api/automation/health
 * Internal Automation Dashboard & Telemetry Endpoint.
 */
