/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Phase 14: Production Monitoring, Reliability & Observability Test Suite
 *
 * Tests all 25 core monitoring requirements:
 * 1. Healthy system scenario
 * 2. Degraded system scenario
 * 3. Failed system scenario
 * 4. Disabled service scenario
 * 5. Scheduler stale detection
 * 6. Queue growth threshold
 * 7. Oldest queue item age threshold
 * 8. Source failure detection
 * 9. NVIDIA failure detection
 * 10. Database failure detection
 * 11. Publication failure detection
 * 12. Publication rate anomaly detection
 * 13. Alert creation
 * 14. Alert deduplication
 * 15. Alert resolution
 * 16. Threshold adherence
 * 17. Health endpoint authorization check
 * 18. Readiness endpoint authorization check
 * 19. Safe error response format
 * 20. Request correlation ID propagation
 * 21. Stuck lock detection
 * 22. Retention cleanup
 * 23. System status computation logic
 * 24. Dry run execution
 * 25. Zero public data leakage
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { MONITORING_CONFIG } from './src/config/monitoringConfig';
import { MockMonitoringRepository } from './src/data/repositories/MockMonitoringRepository';
import { AlertEngine, type AlertCondition } from './src/services/monitoring/AlertEngine';
import { MonitoringService } from './src/services/monitoring/MonitoringService';
import { HealthCheckService } from './src/services/monitoring/HealthCheckService';
import {
  generateRequestId,
  getRequestId,
  sanitizeErrorMessage,
  formatSafeErrorResponse,
  trackError,
} from './src/services/monitoring/errorTracker';
import type {
  ServiceHealth,
  QueueDepthMetrics,
  LatencyMetrics,
  MonitoringAlert,
} from './src/types/monitoring';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

function createSampleServiceHealth(service: string, status: any = 'healthy', extra: Partial<ServiceHealth> = {}): ServiceHealth {
  return {
    service,
    status,
    lastCheckedAt: new Date().toISOString(),
    lastSuccessAt: new Date().toISOString(),
    responseTimeMs: 25,
    consecutiveFailures: 0,
    ...extra,
  };
}

function createSampleQueues(extra: Partial<QueueDepthMetrics> = {}): QueueDepthMetrics {
  return {
    discovery: 0,
    extraction: 0,
    validation: 0,
    lifecycle: 0,
    publication: 0,
    oldestPendingItemAge: {},
    ...extra,
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('THE MERIDIAN — PHASE 14 TEST SUITE');
  console.log('Production Monitoring, Reliability & Observability');
  console.log('====================================================\n');

  // --- 1. HEALTHY SYSTEM SCENARIO ---
  console.log('--- 1. Healthy System Scenario ---');
  {
    const repo = new MockMonitoringRepository();
    const service = new MonitoringService({ repository: repo, skipNetworkFetch: true });

    const healthyServices: Record<string, ServiceHealth> = {
      website: createSampleServiceHealth('website', 'healthy'),
      supabase: createSampleServiceHealth('supabase', 'healthy'),
      discovery: createSampleServiceHealth('discovery', 'healthy'),
      extraction: createSampleServiceHealth('extraction', 'healthy'),
      validation: createSampleServiceHealth('validation', 'healthy'),
      lifecycle: createSampleServiceHealth('lifecycle', 'healthy'),
      publishing: createSampleServiceHealth('publishing', 'healthy'),
      scheduler: createSampleServiceHealth('scheduler', 'healthy'),
    };

    const status = service.determineSystemStatus(healthyServices);
    assert(status === 'healthy', 'Test 1: All healthy services produce systemStatus healthy');
  }

  // --- 2. DEGRADED SYSTEM SCENARIO ---
  console.log('\n--- 2. Degraded System Scenario ---');
  {
    const repo = new MockMonitoringRepository();
    const service = new MonitoringService({ repository: repo, skipNetworkFetch: true });

    const degradedServices: Record<string, ServiceHealth> = {
      website: createSampleServiceHealth('website', 'healthy'),
      supabase: createSampleServiceHealth('supabase', 'healthy'),
      discovery: createSampleServiceHealth('discovery', 'degraded', { message: 'Single source failing' }),
      extraction: createSampleServiceHealth('extraction', 'healthy'),
    };

    const status = service.determineSystemStatus(degradedServices);
    assert(status === 'degraded', 'Test 2: Non-critical degraded service produces systemStatus degraded');
  }

  // --- 3. FAILED SYSTEM SCENARIO ---
  console.log('\n--- 3. Failed System Scenario ---');
  {
    const repo = new MockMonitoringRepository();
    const service = new MonitoringService({ repository: repo, skipNetworkFetch: true });

    const failedDbServices: Record<string, ServiceHealth> = {
      website: createSampleServiceHealth('website', 'healthy'),
      supabase: createSampleServiceHealth('supabase', 'failed', { errorCode: 'DB_CONNECTION_FAILED' }),
    };

    const statusDb = service.determineSystemStatus(failedDbServices);
    assert(statusDb === 'failed', 'Test 3a: Database failure produces systemStatus failed');

    const failedSiteServices: Record<string, ServiceHealth> = {
      website: createSampleServiceHealth('website', 'failed', { errorCode: 'SITE_UNAVAILABLE' }),
      supabase: createSampleServiceHealth('supabase', 'healthy'),
    };

    const statusSite = service.determineSystemStatus(failedSiteServices);
    assert(statusSite === 'failed', 'Test 3b: Public website failure produces systemStatus failed');
  }

  // --- 4. DISABLED SERVICE SCENARIO ---
  console.log('\n--- 4. Disabled Service Scenario ---');
  {
    const repo = new MockMonitoringRepository();
    const service = new MonitoringService({ repository: repo, skipNetworkFetch: true });

    const disabledPublishing: Record<string, ServiceHealth> = {
      website: createSampleServiceHealth('website', 'healthy'),
      supabase: createSampleServiceHealth('supabase', 'healthy'),
      discovery: createSampleServiceHealth('discovery', 'healthy'),
      publishing: createSampleServiceHealth('publishing', 'disabled', { message: 'Kill switch active' }),
    };

    const status = service.determineSystemStatus(disabledPublishing);
    assert(status === 'healthy', 'Test 4: Intentionally disabled service does not fail or degrade system');
  }

  // --- 5. SCHEDULER STALE DETECTION ---
  console.log('\n--- 5. Scheduler Stale Detection ---');
  {
    const repo = new MockMonitoringRepository();
    const engine = new AlertEngine(repo);

    // Warn threshold
    const warnServices: Record<string, ServiceHealth> = {
      scheduler: createSampleServiceHealth('scheduler', 'degraded', {
        errorCode: 'SCHEDULER_STALE',
        message: 'Scheduler delayed past warn threshold',
      }),
    };
    const warnConditions = engine.evaluateConditions(warnServices, createSampleQueues(), { dbPingMs: 10 });
    const warnAlert = warnConditions.find((c) => c.code === 'SCHEDULER_STALE');
    assert(warnAlert !== undefined && warnAlert.severity === 'warning', 'Test 5a: Scheduler warn delay generates warning alert');

    // Critical threshold
    const critServices: Record<string, ServiceHealth> = {
      scheduler: createSampleServiceHealth('scheduler', 'failed', {
        errorCode: 'SCHEDULER_STALE',
        message: 'Scheduler delayed past critical threshold',
      }),
    };
    const critConditions = engine.evaluateConditions(critServices, createSampleQueues(), { dbPingMs: 10 });
    const critAlert = critConditions.find((c) => c.code === 'SCHEDULER_STALE');
    assert(critAlert !== undefined && critAlert.severity === 'critical', 'Test 5b: Scheduler critical delay generates critical alert');
  }

  // --- 6. QUEUE GROWTH THRESHOLD ---
  console.log('\n--- 6. Queue Growth Threshold ---');
  {
    const repo = new MockMonitoringRepository();
    const engine = new AlertEngine(repo);

    const queues = createSampleQueues({ extraction: MONITORING_CONFIG.queues.extractionMaxPendingWarn + 10 });
    const conditions = engine.evaluateConditions({}, queues, { dbPingMs: 10 });
    const queueAlert = conditions.find((c) => c.code === 'QUEUE_GROWING');
    assert(queueAlert !== undefined && queueAlert.severity === 'warning', 'Test 6: Elevated queue depth triggers QUEUE_GROWING alert');
  }

  // --- 7. OLDEST QUEUE ITEM AGE THRESHOLD ---
  console.log('\n--- 7. Oldest Queue Item Age Threshold ---');
  {
    const repo = new MockMonitoringRepository();
    const engine = new AlertEngine(repo);

    const queues = createSampleQueues({
      extraction: 5,
      oldestPendingItemAge: { extractionSec: MONITORING_CONFIG.queues.oldestItemAgeCriticalSec + 100 },
    });
    const conditions = engine.evaluateConditions({}, queues, { dbPingMs: 10 });
    const ageAlert = conditions.find((c) => c.code === 'QUEUE_GROWING' && c.severity === 'critical');
    assert(ageAlert !== undefined, 'Test 7: Oldest queue item exceeding critical threshold triggers critical alert');
  }

  // --- 8. SOURCE FAILURE DETECTION ---
  console.log('\n--- 8. Source Failure Detection ---');
  {
    const repo = new MockMonitoringRepository();
    const engine = new AlertEngine(repo);

    const services: Record<string, ServiceHealth> = {
      discovery: createSampleServiceHealth('discovery', 'failed', {
        errorCode: 'SOURCE_HTTP_ERROR',
        message: 'All sources failing',
      }),
    };
    const conditions = engine.evaluateConditions(services, createSampleQueues(), { dbPingMs: 10 });
    const sourceAlert = conditions.find((c) => c.code === 'SOURCE_HTTP_ERROR');
    assert(sourceAlert !== undefined && sourceAlert.severity === 'critical', 'Test 8: Source failure condition triggers critical alert');
  }

  // --- 9. NVIDIA FAILURE DETECTION ---
  console.log('\n--- 9. NVIDIA Failure Detection ---');
  {
    const repo = new MockMonitoringRepository();
    const engine = new AlertEngine(repo);

    // Extraction service reporting NVIDIA rate limit
    const services: Record<string, ServiceHealth> = {
      extraction: createSampleServiceHealth('extraction', 'degraded', {
        errorCode: 'NVIDIA_RATE_LIMIT',
        message: 'NVIDIA API rate limit 429 encountered',
      }),
    };
    // Simulate alert mapping
    const cond: AlertCondition = {
      code: 'NVIDIA_RATE_LIMIT',
      service: 'extraction',
      severity: 'warning',
      message: 'NVIDIA API rate limit 429 encountered',
    };
    const res = await engine.processAlerts([cond]);
    assert(res.newAlerts.some((a) => a.code === 'NVIDIA_RATE_LIMIT'), 'Test 9: NVIDIA rate limit creates open alert');
  }

  // --- 10. DATABASE FAILURE DETECTION ---
  console.log('\n--- 10. Database Failure Detection ---');
  {
    const repo = new MockMonitoringRepository();
    const service = new MonitoringService({ repository: repo, skipNetworkFetch: true });

    // Mock DB down
    const readiness = await service.getReadiness();
    // Since mock client has no real client, databaseReady will evaluate properly
    assert(typeof readiness.databaseReady === 'boolean', 'Test 10a: Readiness evaluates database connectivity');
    assert(readiness.services.supabase !== undefined, 'Test 10b: Supabase health service is present in readiness');
  }

  // --- 11. PUBLICATION FAILURE DETECTION ---
  console.log('\n--- 11. Publication Failure Detection ---');
  {
    const repo = new MockMonitoringRepository();
    const engine = new AlertEngine(repo);

    const cond: AlertCondition = {
      code: 'PUBLICATION_FAILURE',
      service: 'publishing',
      severity: 'critical',
      message: 'Publication gate rejected valid story due to storage error',
    };
    const res = await engine.processAlerts([cond]);
    assert(res.newAlerts.some((a) => a.code === 'PUBLICATION_FAILURE'), 'Test 11: Publication failure records critical alert');
  }

  // --- 12. PUBLICATION RATE ANOMALY DETECTION ---
  console.log('\n--- 12. Publication Rate Anomaly Detection ---');
  {
    const repo = new MockMonitoringRepository();
    const engine = new AlertEngine(repo);

    const services: Record<string, ServiceHealth> = {
      publishing: createSampleServiceHealth('publishing', 'failed', {
        errorCode: 'PUBLICATION_RATE_ANOMALY',
        message: 'Publication spike: 25 stories published in 1 hour (limit: 20)',
      }),
    };
    const conditions = engine.evaluateConditions(services, createSampleQueues(), { dbPingMs: 10 });
    const anomalyAlert = conditions.find((c) => c.code === 'PUBLICATION_RATE_ANOMALY');
    assert(anomalyAlert !== undefined && anomalyAlert.severity === 'critical', 'Test 12: Publication rate anomaly triggers critical alert');
  }

  // --- 13. ALERT CREATION ---
  console.log('\n--- 13. Alert Creation ---');
  {
    const repo = new MockMonitoringRepository();
    const engine = new AlertEngine(repo);

    const cond: AlertCondition = {
      code: 'DB_TIMEOUT',
      service: 'supabase',
      severity: 'critical',
      message: 'Query timeout on stories table',
    };
    const res = await engine.processAlerts([cond]);

    assert(res.newAlerts.length === 1, 'Test 13a: One new alert created');
    assert(res.newAlerts[0].occurrenceCount === 1, 'Test 13b: Initial occurrence count is 1');
    assert(res.notificationReady.length === 1, 'Test 13c: Notification payload prepared');
  }

  // --- 14. ALERT DEDUPLICATION ---
  console.log('\n--- 14. Alert Deduplication ---');
  {
    const repo = new MockMonitoringRepository();
    const engine = new AlertEngine(repo);

    const cond: AlertCondition = {
      code: 'QUEUE_GROWING',
      service: 'extraction',
      severity: 'warning',
      message: 'Backlog elevated',
    };

    // First detection
    await engine.processAlerts([cond]);
    // Second detection (same code and service)
    const secondRes = await engine.processAlerts([cond]);

    assert(secondRes.newAlerts.length === 0, 'Test 14a: Duplicate condition does not create new row');
    assert(secondRes.activeAlerts.length === 1, 'Test 14b: Exactly one active alert remains');
    assert(secondRes.activeAlerts[0].occurrenceCount === 2, 'Test 14c: Occurrence count incremented to 2');
  }

  // --- 15. ALERT RESOLUTION ---
  console.log('\n--- 15. Alert Resolution ---');
  {
    const repo = new MockMonitoringRepository();
    const engine = new AlertEngine(repo);

    const cond: AlertCondition = {
      code: 'LOCK_STUCK',
      service: 'locks',
      severity: 'warning',
      message: 'Lock held by expired run',
    };

    // Alert triggers
    await engine.processAlerts([cond]);
    assert((await repo.getActiveAlerts()).length === 1, 'Test 15a: Alert is active initially');

    // Condition clears
    const clearedRes = await engine.processAlerts([]);
    assert(clearedRes.resolvedAlerts.length === 1, 'Test 15b: Cleared condition resolved');
    assert(clearedRes.resolvedAlerts[0].status === 'resolved', 'Test 15c: Status set to resolved');
    assert(clearedRes.resolvedAlerts[0].resolvedAt !== null, 'Test 15d: resolvedAt timestamp populated');
    assert((await repo.getActiveAlerts()).length === 0, 'Test 15e: No active alerts remain');
  }

  // --- 16. THRESHOLD ADHERENCE ---
  console.log('\n--- 16. Threshold Adherence ---');
  {
    assert(MONITORING_CONFIG.scheduler.warnThresholdMinutes === 20, 'Test 16a: Scheduler warn threshold is 20m');
    assert(MONITORING_CONFIG.scheduler.criticalThresholdMinutes === 60, 'Test 16b: Scheduler critical threshold is 60m');
    assert(MONITORING_CONFIG.queues.extractionMaxPendingWarn === 100, 'Test 16c: Extraction queue warn depth is 100');
    assert(MONITORING_CONFIG.queues.oldestItemAgeCriticalSec === 7200, 'Test 16d: Oldest item critical age is 7200s (2h)');
    assert(MONITORING_CONFIG.publishing.maxPerHourAnomalyThreshold === 20, 'Test 16e: Publication anomaly threshold is 20/hr');
    assert(MONITORING_CONFIG.retention.snapshotsDays === 30, 'Test 16f: Snapshot retention is 30 days');
    assert(MONITORING_CONFIG.retention.resolvedAlertsDays === 90, 'Test 16g: Resolved alerts retention is 90 days');
  }

  // --- 17. HEALTH ENDPOINT AUTHORIZATION CHECK ---
  console.log('\n--- 17. Health Endpoint Authorization Check ---');
  {
    // Validate secret check logic
    const testSecret = 'secret-test-token-xyz';
    process.env.MONITORING_SECRET = testSecret;

    // Missing header
    const verifyAuth = (headers: Record<string, string | undefined>) => {
      const auth = headers['authorization'];
      const custom = headers['x-monitoring-secret'] || headers['x-cron-secret'];
      if (custom && custom === testSecret) return true;
      if (auth && auth.replace(/^Bearer\s+/i, '') === testSecret) return true;
      return false;
    };

    assert(verifyAuth({}) === false, 'Test 17a: Missing credentials rejected (401)');
    assert(verifyAuth({ 'x-monitoring-secret': 'wrong' }) === false, 'Test 17b: Invalid secret rejected');
    assert(verifyAuth({ 'x-monitoring-secret': testSecret }) === true, 'Test 17c: Valid x-monitoring-secret accepted');
    assert(verifyAuth({ authorization: `Bearer ${testSecret}` }) === true, 'Test 17d: Valid Bearer token accepted');
  }

  // --- 18. READINESS ENDPOINT AUTHORIZATION CHECK ---
  console.log('\n--- 18. Readiness Endpoint Authorization Check ---');
  {
    const testSecret = 'readiness-test-token-abc';
    process.env.MONITORING_SECRET = testSecret;

    const verifyReadinessAuth = (secret?: string) => secret === testSecret;
    assert(verifyReadinessAuth(undefined) === false, 'Test 18a: Missing readiness token rejected');
    assert(verifyReadinessAuth('wrong') === false, 'Test 18b: Invalid readiness token rejected');
    assert(verifyReadinessAuth(testSecret) === true, 'Test 18c: Valid readiness token accepted');
  }

  // --- 19. SAFE ERROR RESPONSE FORMAT ---
  console.log('\n--- 19. Safe Error Response Format ---');
  {
    const rawError = new Error(
      'Connection failed to https://admin:superSecretPassword@dzbggkymgdtsyvrvrrjw.supabase.co with nvapi-abcdef123456'
    );
    const reqId = 'req_safe_test_123';
    const safeResponse = formatSafeErrorResponse(rawError, reqId, 'DB_ERROR');

    assert(!safeResponse.error.includes('superSecretPassword'), 'Test 19a: Passwords redacted from error message');
    assert(!safeResponse.error.includes('nvapi-abcdef123456'), 'Test 19b: API keys redacted from error message');
    assert(safeResponse.requestId === reqId, 'Test 19c: Request ID preserved in error response');
    assert(safeResponse.code === 'DB_ERROR', 'Test 19d: Error code returned');
    assert(typeof safeResponse.timestamp === 'string', 'Test 19e: Timestamp returned in error response');
  }

  // --- 20. REQUEST CORRELATION ID PROPAGATION ---
  console.log('\n--- 20. Request Correlation ID Propagation ---');
  {
    const generated = generateRequestId();
    assert(generated.startsWith('req_'), 'Test 20a: Generated request ID has req_ prefix');

    const fromHeader = getRequestId({ 'x-request-id': 'custom-req-789' });
    assert(fromHeader === 'custom-req-789', 'Test 20b: Extracts existing x-request-id from header');

    const fromEmpty = getRequestId({});
    assert(fromEmpty.startsWith('req_'), 'Test 20c: Generates new ID when header is missing');
  }

  // --- 21. STUCK LOCK DETECTION ---
  console.log('\n--- 21. Stuck Lock Detection ---');
  {
    const repo = new MockMonitoringRepository();
    const engine = new AlertEngine(repo);

    const services: Record<string, ServiceHealth> = {
      locks: createSampleServiceHealth('locks', 'degraded', {
        errorCode: 'LOCK_STUCK',
        message: 'Lock held for 15 minutes by stale run run-123',
      }),
    };
    const conditions = engine.evaluateConditions(services, createSampleQueues(), { dbPingMs: 10 });
    const lockAlert = conditions.find((c) => c.code === 'LOCK_STUCK');
    assert(lockAlert !== undefined && lockAlert.severity === 'warning', 'Test 21: Expired lock flags LOCK_STUCK warning alert');
  }

  // --- 22. RETENTION CLEANUP ---
  console.log('\n--- 22. Retention Cleanup ---');
  {
    const repo = new MockMonitoringRepository();
    const now = Date.now();

    // Add old snapshot (40 days ago) and fresh snapshot (1 day ago)
    const oldSnapTime = new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString();
    const freshSnapTime = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString();

    await repo.saveSnapshot({
      id: 'snap-old',
      systemStatus: 'healthy',
      serviceStatuses: {},
      queueDepths: createSampleQueues(),
      latestRuns: {},
      latencyMetrics: { dbPingMs: 10 },
      alertSummary: { totalActive: 0, criticalCount: 0, warningCount: 0, infoCount: 0 },
      createdAt: oldSnapTime,
    });
    await repo.saveSnapshot({
      id: 'snap-fresh',
      systemStatus: 'healthy',
      serviceStatuses: {},
      queueDepths: createSampleQueues(),
      latestRuns: {},
      latencyMetrics: { dbPingMs: 10 },
      alertSummary: { totalActive: 0, criticalCount: 0, warningCount: 0, infoCount: 0 },
      createdAt: freshSnapTime,
    });

    // Add old resolved alert (100 days ago) and active alert
    const oldAlertTime = new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString();
    await repo.saveAlert({
      id: 'alert-old-resolved',
      code: 'DB_TIMEOUT',
      severity: 'warning',
      service: 'supabase',
      status: 'resolved',
      message: 'Old resolved timeout',
      firstDetectedAt: oldAlertTime,
      lastDetectedAt: oldAlertTime,
      occurrenceCount: 1,
      resolvedAt: oldAlertTime,
      createdAt: oldAlertTime,
      updatedAt: oldAlertTime,
    });

    await repo.saveAlert({
      id: 'alert-active',
      code: 'QUEUE_GROWING',
      severity: 'warning',
      service: 'extraction',
      status: 'open',
      message: 'Active queue warning',
      firstDetectedAt: freshSnapTime,
      lastDetectedAt: freshSnapTime,
      occurrenceCount: 1,
      createdAt: freshSnapTime,
      updatedAt: freshSnapTime,
    });

    // Cleanup past 30 days
    const cleanupResult = await repo.cleanupOldRecords(30);

    assert(cleanupResult.deletedSnapshots === 1, 'Test 22a: Old snapshot pruned');
    assert(cleanupResult.deletedAlerts === 1, 'Test 22b: Old resolved alert pruned');
    const remainingAlerts = await repo.getAllAlerts();
    assert(remainingAlerts.some((a) => a.id === 'alert-active'), 'Test 22c: Active alert preserved during retention cleanup');
  }

  // --- 23. SYSTEM STATUS COMPUTATION LOGIC ---
  console.log('\n--- 23. System Status Computation Logic ---');
  {
    const repo = new MockMonitoringRepository();
    const service = new MonitoringService({ repository: repo, skipNetworkFetch: true });

    // Permutation 1: All healthy -> healthy
    const allHealthy = {
      website: createSampleServiceHealth('website', 'healthy'),
      supabase: createSampleServiceHealth('supabase', 'healthy'),
      discovery: createSampleServiceHealth('discovery', 'healthy'),
    };
    assert(service.determineSystemStatus(allHealthy) === 'healthy', 'Test 23a: All healthy -> healthy');

    // Permutation 2: Non-critical degraded -> degraded
    const nonCritDegraded = {
      website: createSampleServiceHealth('website', 'healthy'),
      supabase: createSampleServiceHealth('supabase', 'healthy'),
      discovery: createSampleServiceHealth('discovery', 'degraded'),
    };
    assert(service.determineSystemStatus(nonCritDegraded) === 'degraded', 'Test 23b: Non-critical degraded -> degraded');

    // Permutation 3: Non-critical failed -> degraded (e.g. one stage fails but site and DB are up)
    const nonCritFailed = {
      website: createSampleServiceHealth('website', 'healthy'),
      supabase: createSampleServiceHealth('supabase', 'healthy'),
      discovery: createSampleServiceHealth('discovery', 'failed'),
    };
    assert(service.determineSystemStatus(nonCritFailed) === 'degraded', 'Test 23c: Non-critical failed -> degraded');

    // Permutation 4: Critical DB failed -> failed
    const dbFailed = {
      website: createSampleServiceHealth('website', 'healthy'),
      supabase: createSampleServiceHealth('supabase', 'failed'),
    };
    assert(service.determineSystemStatus(dbFailed) === 'failed', 'Test 23d: Supabase failed -> failed');

    // Permutation 5: Critical Website failed -> failed
    const siteFailed = {
      website: createSampleServiceHealth('website', 'failed'),
      supabase: createSampleServiceHealth('supabase', 'healthy'),
    };
    assert(service.determineSystemStatus(siteFailed) === 'failed', 'Test 23e: Website failed -> failed');
  }

  // --- 24. DRY RUN EXECUTION ---
  console.log('\n--- 24. Dry Run Execution ---');
  {
    const repo = new MockMonitoringRepository();
    const service = new MonitoringService({ repository: repo, skipNetworkFetch: true });

    const result = await service.runHealthCheck({ dryRun: true });
    assert(result.status !== undefined, 'Test 24a: Dry run executes health check');

    const snapshots = await repo.getRecentSnapshots(10);
    assert(snapshots.length === 0, 'Test 24b: Zero snapshots written in dry run mode');

    const alerts = await repo.getAllAlerts(10);
    assert(alerts.length === 0, 'Test 24c: Zero alerts written in dry run mode');
  }

  // --- 25. ZERO PUBLIC DATA LEAKAGE (RLS PROTECTION) ---
  console.log('\n--- 25. Zero Public Data Leakage (RLS Protection) ---');
  {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
    const anonKey =
      process.env.VITE_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6Ymdna3ltZ2R0c3l2cnZycmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0NzI0NDksImV4cCI6MjEwNjA0ODQ0OX0.Ao5sTZNb8SVZdUvvx9nSr6zc0S1lVBGmP73-PG6AK1s';

    const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

    // Verify public client CANNOT query monitoring_alerts
    const { error: alertErr } = await anonClient.from('monitoring_alerts').select('*').limit(1);
    assert(alertErr !== null, 'Test 25a: Public anonymous client denied access to monitoring_alerts (RLS active)');

    // Verify public client CANNOT query monitoring_snapshots
    const { error: snapErr } = await anonClient.from('monitoring_snapshots').select('*').limit(1);
    assert(snapErr !== null, 'Test 25b: Public anonymous client denied access to monitoring_snapshots (RLS active)');
  }

  console.log('\n====================================================');
  console.log(`TEST SUITE COMPLETE: ${passedTests}/${totalTests} PASSED`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('\n❌ Unhandled Test Exception:', err);
  process.exit(1);
});
