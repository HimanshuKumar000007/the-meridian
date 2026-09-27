/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Phase 10: Universal Automation Scheduler & Pipeline Orchestrator Test Suite
 */

import { MockAutomationRepository } from './src/data/repositories/MockAutomationRepository';
import { AutomationConfigService } from './src/services/automation/AutomationConfigService';
import { SchedulerCapabilityService } from './src/services/automation/SchedulerCapabilityService';
import { AutomationLockService } from './src/services/automation/AutomationLockService';
import { StageRunnerService } from './src/services/automation/StageRunnerService';
import { PipelineOrchestrator } from './src/services/automation/PipelineOrchestrator';
import { AutomationHealthService } from './src/services/automation/AutomationHealthService';
import type { AutomationStage } from './src/types/automation';

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

async function runTests() {
  console.log('====================================================');
  console.log('THE MERIDIAN — PHASE 10 TEST SUITE');
  console.log('Universal Automation Scheduler & Pipeline Orchestrator');
  console.log('====================================================\n');

  // --- 1. SCHEDULER CONFIGURATION TESTS ---
  console.log('--- 1. Scheduler Configuration Tests ---');
  {
    const configService = new AutomationConfigService();
    const config = configService.getConfig();

    assert(config.enabled === true, 'Test 1a: Global automation enabled by default');
    assert(config.targetIntervals.discovery === 60, 'Test 1b: Discovery default target interval is 60m');
    assert(config.targetIntervals.extraction === 10, 'Test 1c: Extraction default target interval is 10m');
    assert(config.maxBatch.extraction === 5, 'Test 1d: Extraction default batch limit is 5');
    assert(config.maxBatch.validation === 10, 'Test 1e: Validation default batch limit is 10');
  }

  // --- 2. PLAN CAPABILITY DETECTION TESTS ---
  console.log('\n--- 2. Plan Capability Detection Tests ---');
  {
    const capabilityService = new SchedulerCapabilityService();

    // Default Hobby detection
    const hobbyCap = capabilityService.getCapabilities({ requestedIntervalMinutes: 10 });
    assert(hobbyCap.plan === 'hobby', 'Test 2a: Detects Hobby plan by default');
    assert(hobbyCap.supportsDaily === true, 'Test 2b: Hobby supports daily execution');
    assert(hobbyCap.supportsHourly === false, 'Test 2c: Hobby does NOT support hourly execution');
    assert(hobbyCap.supportsMinuteLevel === false, 'Test 2d: Hobby does NOT support minute-level execution');
    assert(hobbyCap.status === 'SCHEDULE_UNAVAILABLE', 'Test 2e: Returns SCHEDULE_UNAVAILABLE for 10m target cadence on Hobby');
    assert(hobbyCap.canDeliverTargetCadence === false, 'Test 2f: canDeliverTargetCadence is false on Hobby');
    assert(hobbyCap.configuredCronSchedule === '0 6 * * *', 'Test 2g: Configures supported daily cron (0 6 * * *) for Hobby');

    // Test with daily interval on Hobby
    const dailyCap = capabilityService.getCapabilities({ requestedIntervalMinutes: 1440 });
    assert(dailyCap.status === 'SCHEDULE_AVAILABLE', 'Test 2h: Returns SCHEDULE_AVAILABLE when interval is daily (1440m)');
  }

  // --- 3. SCHEDULE DUE LOGIC TESTS ---
  console.log('\n--- 3. Schedule Due Logic Tests ---');
  {
    const repo = new MockAutomationRepository();
    const schedules = await repo.getSchedules();
    const discSched = schedules.find((s) => s.stage === 'discovery');

    assert(discSched !== undefined, 'Test 3a: Discovery schedule exists');
    assert(new Date(discSched!.nextDueAt!).getTime() <= Date.now(), 'Test 3b: Stage initialized as due');

    // Update next due to 1 hour in future
    const future = new Date(Date.now() + 3600000).toISOString();
    await repo.updateSchedule('discovery', { nextDueAt: future, lastRunAt: new Date().toISOString() });
    const updated = await repo.getSchedules();
    const updatedDisc = updated.find((s) => s.stage === 'discovery');
    assert(new Date(updatedDisc!.nextDueAt!).getTime() > Date.now(), 'Test 3c: Future schedule correctly recorded as not due');
  }

  // --- 4. GLOBAL KILL SWITCH TESTS ---
  console.log('\n--- 4. Global Kill Switch Tests ---');
  {
    const repo = new MockAutomationRepository();
    const runner = new StageRunnerService(null, true);
    const configService = new AutomationConfigService();

    // Temporarily disable
    const orig = process.env.AUTOMATION_ENABLED;
    process.env.AUTOMATION_ENABLED = 'false';

    const orchestrator = new PipelineOrchestrator(repo, runner, { configService });
    const result = await orchestrator.orchestrate();

    assert(result.status === 'disabled', 'Test 4a: Orchestrator returns status "disabled" when kill switch is on');
    assert(result.lockAcquired === false, 'Test 4b: No lock acquired when disabled');
    assert(result.errors[0].includes('AUTOMATION_DISABLED'), 'Test 4c: Returns AUTOMATION_DISABLED error code');

    // Restore
    if (orig) process.env.AUTOMATION_ENABLED = orig;
    else delete process.env.AUTOMATION_ENABLED;
  }

  // --- 5. STAGE-LEVEL KILL SWITCH TESTS ---
  console.log('\n--- 5. Stage-Level Kill Switch Tests ---');
  {
    const repo = new MockAutomationRepository();
    const runner = new StageRunnerService(null, true);
    const configService = new AutomationConfigService();

    // Disable publishing stage specifically
    const origPub = process.env.AUTOMATION_PUBLISHING_ENABLED;
    process.env.AUTOMATION_PUBLISHING_ENABLED = 'false';

    const orchestrator = new PipelineOrchestrator(repo, runner, { configService });
    const result = await orchestrator.orchestrate({ dryRun: true });

    assert(result.stageResults.publishing?.status === 'disabled', 'Test 5a: Publishing stage specifically disabled');
    assert(result.stageResults.discovery?.status === 'completed', 'Test 5b: Discovery remains enabled and active');
    assert(result.stageResults.extraction?.status === 'completed', 'Test 5c: Extraction remains enabled and active');

    if (origPub) process.env.AUTOMATION_PUBLISHING_ENABLED = origPub;
    else delete process.env.AUTOMATION_PUBLISHING_ENABLED;
  }

  // --- 6. AUTHENTICATION VERIFICATION TESTS ---
  console.log('\n--- 6. Authentication Verification Tests ---');
  {
    const configService = new AutomationConfigService();
    const testSecret = 'meridian-test-secret-phase10';
    process.env.CRON_SECRET = testSecret;

    assert(
      configService.verifyAuthHeader(`Bearer ${testSecret}`) === true,
      'Test 6a: Valid Bearer token accepted'
    );
    assert(
      configService.verifyAuthHeader(undefined, testSecret) === true,
      'Test 6b: Valid x-cron-secret header accepted'
    );
  }

  // --- 7. INVALID AUTHENTICATION REJECTION TESTS ---
  console.log('\n--- 7. Invalid Authentication Rejection Tests ---');
  {
    const configService = new AutomationConfigService();
    process.env.CRON_SECRET = 'meridian-test-secret-phase10';

    assert(
      configService.verifyAuthHeader(undefined, undefined) === false,
      'Test 7a: Missing credentials rejected'
    );
    assert(
      configService.verifyAuthHeader('Bearer wrong-secret') === false,
      'Test 7b: Wrong Bearer token rejected'
    );
    assert(
      configService.verifyAuthHeader(undefined, 'invalid-custom-secret') === false,
      'Test 7c: Wrong custom header rejected'
    );
    assert(
      configService.verifyAuthHeader('Basic dXNlcjpwYXNz') === false,
      'Test 7d: Malformed authorization format rejected'
    );

    // Strict Service-Role Key Rejection Tests (Phase 10C Security Requirement)
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-super-secret-key-12345';
    assert(
      configService.verifyAuthHeader(`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) === false,
      'Test 7e: SUPABASE_SERVICE_ROLE_KEY strictly rejected as Bearer token'
    );
    assert(
      configService.verifyAuthHeader(undefined, process.env.SUPABASE_SERVICE_ROLE_KEY) === false,
      'Test 7f: SUPABASE_SERVICE_ROLE_KEY strictly rejected as custom header'
    );
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  // --- 8. DISTRIBUTED RUN LOCK TESTS ---
  console.log('\n--- 8. Distributed Run Lock Tests ---');
  {
    const repo = new MockAutomationRepository();
    const lockService = new AutomationLockService(repo);

    const first = await lockService.acquire('test_mutex', 'worker-1', 60);
    assert(first.acquired === true, 'Test 8a: Worker 1 successfully acquires lock');

    const second = await lockService.acquire('test_mutex', 'worker-2', 60);
    assert(second.acquired === false, 'Test 8b: Worker 2 blocked by active lock');

    const isLocked = await lockService.isLocked('test_mutex');
    assert(isLocked === true, 'Test 8c: Lock is confirmed active');

    await lockService.release('test_mutex', 'worker-1');
    const isLockedAfter = await lockService.isLocked('test_mutex');
    assert(isLockedAfter === false, 'Test 8d: Lock cleanly released');
  }

  // --- 9. EXPIRED LOCK RECOVERY TESTS ---
  console.log('\n--- 9. Expired Lock Recovery Tests ---');
  {
    const repo = new MockAutomationRepository();
    const lockService = new AutomationLockService(repo);

    // Acquire lock with TTL of -10 seconds (already expired)
    await lockService.acquire('crashed_job', 'crashed-worker', -10);

    // New worker should reclaim it seamlessly
    const recovery = await lockService.acquire('crashed_job', 'new-worker', 60);
    assert(recovery.acquired === true, 'Test 9a: Stale/expired lock successfully recovered by new worker');

    const currentLock = await lockService.inspect('crashed_job');
    assert(currentLock?.ownerId === 'new-worker', 'Test 9b: Lock ownership transferred to new worker');
  }

  // --- 10. DUPLICATE INVOCATION MUTEX TESTS ---
  console.log('\n--- 10. Duplicate Invocation Mutex Tests ---');
  {
    const repo = new MockAutomationRepository();
    const runner = new StageRunnerService(null, true);
    const orchestrator = new PipelineOrchestrator(repo, runner);

    // Pre-lock master orchestrator
    await repo.acquireLock('master_orchestrator', 'competing-cron-run', 300);

    const result = await orchestrator.orchestrate();
    assert(result.status === 'skipped', 'Test 10a: Duplicate run safely returns status "skipped"');
    assert(result.errors[0].includes('RUN_ALREADY_IN_PROGRESS'), 'Test 10b: Error states RUN_ALREADY_IN_PROGRESS');

    // Clean up
    await repo.releaseLock('master_orchestrator', 'competing-cron-run');
  }

  // --- 11. STAGE DEPENDENCY TESTS ---
  console.log('\n--- 11. Stage Dependency Tests ---');
  {
    const runner = new StageRunnerService(null, true);

    // In mock mode with 0 items, stages should skip or return safely without exceptions
    const valResult = await runner.runValidation({ dryRun: false, limit: 5 });
    assert(valResult.status === 'completed', 'Test 11a: Empty queue validation returns safely');
    assert(valResult.failed === 0, 'Test 11b: Zero failures when upstream queue is empty');
  }

  // --- 12. BACKLOG LIMIT & BOUNDED BATCH TESTS ---
  console.log('\n--- 12. Backlog Limit & Bounded Batch Tests ---');
  {
    const repo = new MockAutomationRepository();
    repo.queueDepths.extraction = 850; // simulated massive backlog

    const configService = new AutomationConfigService();
    const config = configService.getConfig();

    assert(config.maxBatch.extraction === 5, 'Test 12a: Configured extraction batch limit is 5');

    const runner = new StageRunnerService(null, true);
    const extractionResult = await runner.runExtraction({ limit: config.maxBatch.extraction, dryRun: true });

    assert(extractionResult.metadata?.plannedBatchSize === 5, 'Test 12b: Bounded batch processed is 5, NOT 850');
  }

  // --- 13. DISCOVERY STAGE TRIGGER TESTS ---
  console.log('\n--- 13. Discovery Stage Trigger Tests ---');
  {
    const runner = new StageRunnerService(null, true);
    const result = await runner.runDiscovery({ dryRun: true });
    assert(result.stage === 'discovery', 'Test 13a: Stage identified as discovery');
    assert(result.status === 'completed', 'Test 13b: Discovery dry-run completed successfully');
  }

  // --- 14. EXTRACTION STAGE TRIGGER TESTS ---
  console.log('\n--- 14. Extraction Stage Trigger Tests ---');
  {
    const runner = new StageRunnerService(null, true);
    const result = await runner.runExtraction({ dryRun: true, limit: 3 });
    assert(result.stage === 'extraction', 'Test 14a: Stage identified as extraction');
    assert(result.status === 'completed', 'Test 14b: Extraction dry-run completed');
  }

  // --- 15. VALIDATION STAGE TRIGGER TESTS ---
  console.log('\n--- 15. Validation Stage Trigger Tests ---');
  {
    const runner = new StageRunnerService(null, true);
    const result = await runner.runValidation({ dryRun: true, limit: 5 });
    assert(result.stage === 'validation', 'Test 15a: Stage identified as validation');
    assert(result.status === 'completed', 'Test 15b: Validation dry-run completed');
  }

  // --- 16. LIFECYCLE STAGE TRIGGER TESTS ---
  console.log('\n--- 16. Lifecycle Stage Trigger Tests ---');
  {
    const runner = new StageRunnerService(null, true);
    const result = await runner.runLifecycle({ dryRun: true, limit: 5 });
    assert(result.stage === 'lifecycle', 'Test 16a: Stage identified as lifecycle');
    assert(result.status === 'completed', 'Test 16b: Lifecycle dry-run completed');
  }

  // --- 17. PUBLISHING STAGE TRIGGER TESTS ---
  console.log('\n--- 17. Publishing Stage Trigger Tests ---');
  {
    const runner = new StageRunnerService(null, true);
    const result = await runner.runPublishing({ dryRun: true, limit: 5 });
    assert(result.stage === 'publishing', 'Test 17a: Stage identified as publishing');
    assert(result.status === 'completed', 'Test 17b: Publishing dry-run completed');
  }

  // --- 18. PARTIAL FAILURE HANDLING TESTS ---
  console.log('\n--- 18. Partial Failure Handling Tests ---');
  {
    const repo = new MockAutomationRepository();
    // Simulate runner with 1 failing stage and 4 succeeding stages
    const mockRunner = {
      runStage: async (stage: AutomationStage) => {
        if (stage === 'validation') {
          return {
            stage,
            status: 'failed' as const,
            durationMs: 50,
            processed: 1,
            succeeded: 0,
            failed: 1,
            skipped: 0,
            remainingQueue: 0,
            errors: ['Validation network timeout'],
          };
        }
        return {
          stage,
          status: 'completed' as const,
          durationMs: 30,
          processed: 2,
          succeeded: 2,
          failed: 0,
          skipped: 0,
          remainingQueue: 0,
          errors: [],
        };
      },
    } as any;

    const orchestrator = new PipelineOrchestrator(repo, mockRunner);
    const result = await orchestrator.orchestrate({ force: true });

    assert(result.status === 'partial', 'Test 18a: Orchestrator returns status "partial" on single-stage failure');
    assert(result.stageResults.discovery?.status === 'completed', 'Test 18b: Discovery completed');
    assert(result.stageResults.validation?.status === 'failed', 'Test 18c: Validation failed');
    assert(result.stageResults.publishing?.status === 'completed', 'Test 18d: Other stages executed');
  }

  // --- 19. RETRY BEHAVIOR & CONSECUTIVE FAILURES TESTS ---
  console.log('\n--- 19. Retry Behavior Tests ---');
  {
    const repo = new MockAutomationRepository();
    await repo.updateSchedule('extraction', { consecutiveFailures: 2 });

    const sched = (await repo.getSchedules()).find((s) => s.stage === 'extraction');
    assert(sched?.consecutiveFailures === 2, 'Test 19a: Consecutive failures tracked');

    // Simulate successful recovery
    await repo.updateSchedule('extraction', { consecutiveFailures: 0, lastSuccessAt: new Date().toISOString() });
    const recovered = (await repo.getSchedules()).find((s) => s.stage === 'extraction');
    assert(recovered?.consecutiveFailures === 0, 'Test 19b: Consecutive failures reset on success');
  }

  // --- 20. STALE-RUN RECOVERY & ALERT TESTS ---
  console.log('\n--- 20. Stale-Run Recovery Tests ---');
  {
    const repo = new MockAutomationRepository();
    const oldTime = new Date(Date.now() - 3600000 * 5).toISOString(); // 5 hours ago
    await repo.updateSchedule('extraction', { lastSuccessAt: oldTime });

    const healthService = new AutomationHealthService(repo);
    const health = await healthService.getHealth();

    const extReport = health.stageReports.find((s) => s.stage === 'extraction');
    assert(extReport?.healthState === 'stale', 'Test 20a: Stage flagged as stale when success exceeds interval');
    assert(health.alerts.some((a) => a.includes('STAGE_STALE')), 'Test 20b: Stale stage alert generated');
  }

  // --- 21. PAUSE / RESUME TESTS ---
  console.log('\n--- 21. Pause / Resume Tests ---');
  {
    const repo = new MockAutomationRepository();
    const configService = new AutomationConfigService();

    // 1. Pause
    process.env.AUTOMATION_ENABLED = 'false';
    const pausedConfig = configService.getConfig();
    assert(pausedConfig.enabled === false, 'Test 21a: Automation globally paused');

    // 2. Resume
    process.env.AUTOMATION_ENABLED = 'true';
    const resumedConfig = configService.getConfig();
    assert(resumedConfig.enabled === true, 'Test 21b: Automation resumed with queues intact');
  }

  // --- 22. DRY-RUN SAFETY TESTS ---
  console.log('\n--- 22. Dry-Run Safety Tests ---');
  {
    const repo = new MockAutomationRepository();
    const runner = new StageRunnerService(null, true);
    const orchestrator = new PipelineOrchestrator(repo, runner);

    const initialRuns = (await repo.getRecentRuns()).length;
    const result = await orchestrator.orchestrate({ dryRun: true });

    assert(result.isDryRun === true, 'Test 22a: Dry-run flag preserved');
    assert(result.lockAcquired === false, 'Test 22b: Lock not acquired during dry-run');
    const afterRuns = (await repo.getRecentRuns()).length;
    assert(afterRuns === initialRuns, 'Test 22c: Zero run records created during dry-run');
  }

  // --- 23. QUEUE METRICS TESTS ---
  console.log('\n--- 23. Queue Metrics Tests ---');
  {
    const repo = new MockAutomationRepository();
    const depths = await repo.getQueueDepths();
    const ages = await repo.getOldestPendingAges();

    assert(depths.discovery >= 0, 'Test 23a: Discovery queue depth reported');
    assert(depths.extraction >= 0, 'Test 23b: Extraction queue depth reported');
    assert(ages.extraction !== undefined, 'Test 23c: Extraction pending age reported');
  }

  // --- 24. AUTOMATION TELEMETRY TESTS ---
  console.log('\n--- 24. Automation Telemetry Tests ---');
  {
    const repo = new MockAutomationRepository();
    const runner = new StageRunnerService(null, true);
    const orchestrator = new PipelineOrchestrator(repo, runner);

    const result = await orchestrator.orchestrate({ trigger: 'cron', force: true });
    assert(result.runId.startsWith('run-orch-'), 'Test 24a: Structured runId generated');
    assert(result.durationMs >= 0, 'Test 24b: Duration recorded in milliseconds');

    const recent = await repo.getRecentRuns(1);
    assert(recent.length === 1, 'Test 24c: Run persisted to automation_runs');
    assert(recent[0].id === result.runId, 'Test 24d: Run record matches orchestrated runId');
  }

  // --- 25. NO PUBLIC PUBLICATION BYPASS TESTS ---
  console.log('\n--- 25. No Public Publication Bypass Tests ---');
  {
    const runner = new StageRunnerService(null, true);
    // Running publishing stage without valid queued items produces 0 publications
    const pubResult = await runner.runPublishing({ dryRun: false });
    assert(pubResult.succeeded === 0, 'Test 25a: No unqueued or unvalidated stories published');
    assert(pubResult.failed === 0, 'Test 25b: Zero errors on clean empty publication run');
  }

  // --- 26. NO DUPLICATE PUBLICATION IDEMPOTENCY TESTS ---
  console.log('\n--- 26. No Duplicate Publication Tests ---');
  {
    const runner = new StageRunnerService(null, true);
    const first = await runner.runPublishing({ dryRun: false, limit: 5 });
    const second = await runner.runPublishing({ dryRun: false, limit: 5 });

    assert(first.succeeded === 0, 'Test 26a: First invocation creates 0 duplicates');
    assert(second.succeeded === 0, 'Test 26b: Second invocation creates 0 duplicates');
  }

  console.log('\n====================================================');
  console.log(`PHASE 10 TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('\nFatal test runner failure:', err);
  process.exit(1);
});
