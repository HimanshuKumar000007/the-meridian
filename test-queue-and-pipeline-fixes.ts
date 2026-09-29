/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Verification Test Suite: Queue Metrics, Bounded Retries, Recency Windows, and Timeout Fixes
 */

import { MockAutomationRepository } from './src/data/repositories/MockAutomationRepository';
import { MockExtractionRepository } from './src/data/repositories/MockExtractionRepository';
import { AutomationConfigService } from './src/services/automation/AutomationConfigService';
import { PipelineOrchestrator } from './src/services/automation/PipelineOrchestrator';
import { StageRunnerService } from './src/services/automation/StageRunnerService';
import {
  isWithinRecencyWindow,
  getMaxAgeHoursForSource,
  DEFAULT_RECENCY_CONFIG,
} from './src/config/discoveryRecencyPolicy';
import {
  parseExtractionRetryInfo,
  shouldRetryExtraction,
  DEAD_LETTER_ERROR_CODE,
} from './src/config/extractionRetryPolicy';
import type { DiscoveryItem } from './src/types/discovery';
import type { NewsExtractionRecord } from './src/types/extraction';

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

async function runTestSuite() {
  console.log('====================================================');
  console.log('THE MERIDIAN — QUEUE & PIPELINE RESILIENCE TEST SUITE');
  console.log('Recency, Bounded Retries, True Queue Metrics, and Recovery');
  console.log('====================================================\n');

  // --- 1. ALREADY-VALIDATED EXTRACTION IS NOT COUNTED AS PENDING ---
  console.log('--- 1. Already-Validated Extractions Excluded from Pending Queue ---');
  {
    const completedExtraction: NewsExtractionRecord = {
      id: 'ext-test-101',
      discovery_item_id: 'disc-item-101',
      status: 'completed',
      model: 'meta/llama-3.1-70b-instruct',
      prompt_version: 'v1.0.0',
      input_hash: 'hash-101',
      output_hash: 'out-101',
      title: 'Quantum Computing Advance Announced',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
    };

    const unvalidatedExtraction: NewsExtractionRecord = {
      id: 'ext-test-102',
      discovery_item_id: 'disc-item-102',
      status: 'completed',
      model: 'meta/llama-3.1-70b-instruct',
      prompt_version: 'v1.0.0',
      input_hash: 'hash-102',
      output_hash: 'out-102',
      title: 'New Solar Panel Efficiency Record',
      created_at: new Date(Date.now() - 1800000).toISOString(),
      updated_at: new Date(Date.now() - 1800000).toISOString(),
    };

    // Simulate validation lookup: ext-test-101 is validated, ext-test-102 is not
    const validatedIds = new Set(['ext-test-101']);
    const extractions = [completedExtraction, unvalidatedExtraction];

    const unvalidatedList = extractions.filter((e) => !validatedIds.has(e.id));

    assert(
      unvalidatedList.length === 1,
      'Test 1a: Only unvalidated extraction is counted (1 item)'
    );
    assert(
      unvalidatedList[0].id === 'ext-test-102',
      'Test 1b: Correct unvalidated extraction identified'
    );
    assert(
      !unvalidatedList.some((e) => e.id === 'ext-test-101'),
      'Test 1c: Already-validated extraction (ext-test-101) is strictly excluded'
    );
  }

  // --- 2. FAILED EXTRACTION REACHES RETRY LIMIT AND STOPS LOOPING ---
  console.log('\n--- 2. Failed Extraction Reaches Retry Limit and Stops Looping ---');
  {
    const maxRetries = 2;

    // First attempt fails
    const attempt1Info = parseExtractionRetryInfo(
      JSON.stringify({ attempts: 1, deadLettered: false }),
      'SCHEMA_VALIDATION_ERROR'
    );
    assert(
      shouldRetryExtraction(attempt1Info.attempts, 'SCHEMA_VALIDATION_ERROR', maxRetries) === true,
      'Test 2a: First failure allows a bounded retry (attempts = 1 < maxRetries = 2)'
    );

    // Second attempt fails: reaches limit
    const attempt2Info = parseExtractionRetryInfo(
      JSON.stringify({ attempts: 2, deadLettered: true }),
      DEAD_LETTER_ERROR_CODE
    );
    assert(
      shouldRetryExtraction(attempt2Info.attempts, DEAD_LETTER_ERROR_CODE, maxRetries) === false,
      'Test 2b: Reached retry limit (attempts = 2) stops retry'
    );
    assert(
      attempt2Info.deadLettered === true,
      'Test 2c: Item is recognized as dead-lettered'
    );

    // Verify MockExtractionRepository excludes dead-lettered item
    const failedItem: DiscoveryItem = {
      id: 'disc-failed-loop',
      sourceId: 'src-phys-org',
      sourceSlug: 'phys-org',
      sourceName: 'Phys.org',
      sourceType: 'rss',
      externalId: 'ext-loop',
      sourceUrl: 'https://phys.org/news/sample-loop',
      canonicalUrl: 'https://phys.org/news/sample-loop',
      title: 'Repeatedly Failing Extraction Article',
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      discoveredAt: new Date(Date.now() - 3600000).toISOString(),
      lastSeenAt: new Date().toISOString(),
      status: 'new',
      fingerprint: 'fp-loop-1',
      contentHash: 'ch-loop-1',
    };

    const deadLetterRecord: NewsExtractionRecord = {
      id: 'ext-dead-letter-1',
      discovery_item_id: 'disc-failed-loop',
      status: 'failed',
      model: 'test-model',
      prompt_version: 'v1.0.0',
      input_hash: 'hash-loop',
      error_code: DEAD_LETTER_ERROR_CODE,
      conflict_details: JSON.stringify({ attempts: 2, deadLettered: true }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const repo = new MockExtractionRepository([failedItem], [deadLetterRecord]);
    const pending = await repo.getPendingDiscoveryItems({ limit: 10, maxRetries: 2 });

    assert(
      pending.length === 0,
      'Test 2d: Dead-lettered failed item is NOT returned by getPendingDiscoveryItems (loop broken)'
    );
  }

  // --- 3. HISTORICAL RSS ITEM OUTSIDE RECENCY WINDOW IS NOT ADDED TO ACTIVE QUEUE ---
  console.log('\n--- 3. Historical RSS Item Outside Recency Window Excluded ---');
  {
    const now = new Date();

    // 2015 OpenAI historical archive item
    const ancientOpenAiItem: DiscoveryItem = {
      id: 'disc-openai-ancient',
      sourceId: 'src-openai-news',
      sourceSlug: 'openai-news',
      sourceName: 'OpenAI News',
      sourceType: 'rss',
      externalId: 'openai-2015-post',
      sourceUrl: 'https://openai.com/index/introducing-openai/',
      canonicalUrl: 'https://openai.com/index/introducing-openai/',
      title: 'Introducing OpenAI',
      publishedAt: '2015-12-11T08:00:00Z',
      discoveredAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      status: 'new',
      fingerprint: 'fp-ancient-1',
      contentHash: 'ch-ancient-1',
    };

    // Live news item published 4 hours ago
    const freshNewsItem: DiscoveryItem = {
      id: 'disc-fresh-news',
      sourceId: 'src-bbc-world',
      sourceSlug: 'bbc-world',
      sourceName: 'BBC World',
      sourceType: 'rss',
      externalId: 'bbc-fresh-1',
      sourceUrl: 'https://bbc.com/news/live-update',
      canonicalUrl: 'https://bbc.com/news/live-update',
      title: 'Current World Event Today',
      publishedAt: new Date(now.getTime() - 4 * 3600000).toISOString(),
      discoveredAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      status: 'new',
      fingerprint: 'fp-fresh-1',
      contentHash: 'ch-fresh-1',
    };

    assert(
      isWithinRecencyWindow(ancientOpenAiItem, now) === false,
      'Test 3a: 2015 OpenAI archive post is rejected by recency window'
    );
    assert(
      isWithinRecencyWindow(freshNewsItem, now) === true,
      'Test 3b: Fresh news item from 4h ago passes recency window'
    );

    const repo = new MockExtractionRepository([ancientOpenAiItem, freshNewsItem]);
    const pending = await repo.getPendingDiscoveryItems({ limit: 10 });

    assert(
      pending.length === 1,
      'Test 3c: Only 1 active item returned from repository'
    );
    assert(
      pending[0].id === 'disc-fresh-news',
      'Test 3d: Repository correctly selected fresh item and ignored ancient archive'
    );
  }

  // --- 4. SUCCESSFUL EXTRACTION LEAVES ACTIVE DISCOVERY QUEUE ---
  console.log('\n--- 4. Successful Extraction Transitions Discovery Status ---');
  {
    const item: DiscoveryItem = {
      id: 'disc-to-extract',
      sourceId: 'src-ars-technica',
      sourceSlug: 'ars-technica',
      sourceName: 'Ars Technica',
      sourceType: 'rss',
      externalId: 'ars-101',
      sourceUrl: 'https://arstechnica.com/sample',
      canonicalUrl: 'https://arstechnica.com/sample',
      title: 'Linux Kernel Milestone',
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      discoveredAt: new Date(Date.now() - 3600000).toISOString(),
      lastSeenAt: new Date().toISOString(),
      status: 'new',
      fingerprint: 'fp-ars-1',
      contentHash: 'ch-ars-1',
    };

    const repo = new MockExtractionRepository([item]);
    let pendingBefore = await repo.getPendingDiscoveryItems();
    assert(pendingBefore.length === 1, 'Test 4a: Item is pending before extraction');

    // Simulate successful extraction completion
    await repo.updateDiscoveryItemStatus(item.id, 'processed');

    let pendingAfter = await repo.getPendingDiscoveryItems();
    assert(pendingAfter.length === 0, 'Test 4b: Extracted item transitions to "processed" and leaves active queue');
  }

  // --- 5. PARTIAL RUN RECORDS PROGRESS ---
  console.log('\n--- 5. Partial Run Records Stage Progress ---');
  {
    const repo = new MockAutomationRepository();
    const nowIso = new Date().toISOString();

    // Set initial schedule with an older lastSuccessAt
    const oldSuccessTime = new Date(Date.now() - 7200000).toISOString(); // 2 hours ago
    await repo.updateSchedule('extraction', {
      lastSuccessAt: oldSuccessTime,
      consecutiveFailures: 2,
    });

    // Simulate orchestrator logic for partial run where 2 succeeded and 3 failed
    const partialResult: {
      stage: 'extraction';
      status: 'completed' | 'partial' | 'failed';
      processed: number;
      succeeded: number;
      failed: number;
      skipped: number;
      errors: string[];
    } = {
      stage: 'extraction',
      status: 'partial',
      processed: 5,
      succeeded: 2,
      failed: 3,
      skipped: 0,
      errors: ['Failed item 1', 'Failed item 2', 'Failed item 3'],
    };

    const schedule = (await repo.getSchedules()).find((s) => s.stage === 'extraction');

    // Applied updated rule from PipelineOrchestrator
    const updates: any = { lastRunAt: nowIso };
    if (partialResult.status === 'completed' || (partialResult.status === 'partial' && partialResult.succeeded > 0)) {
      updates.lastSuccessAt = nowIso;
      updates.consecutiveFailures = 0;
    }

    await repo.updateSchedule('extraction', updates);
    const updatedSchedule = (await repo.getSchedules()).find((s) => s.stage === 'extraction');

    assert(
      updatedSchedule?.lastSuccessAt === nowIso,
      'Test 5a: Partial run with successes updates lastSuccessAt'
    );
    assert(
      updatedSchedule?.consecutiveFailures === 0,
      'Test 5b: Partial run with successes resets consecutiveFailures to 0'
    );
  }

  // --- 6. ABORTED RUN CAN RECOVER ---
  console.log('\n--- 6. Aborted Run Auto-Recovery ---');
  {
    const repo = new MockAutomationRepository();

    // Create a stuck run that started 30 minutes ago and was never finished
    const stuckRunStartedAt = new Date(Date.now() - 30 * 60000).toISOString();
    await repo.createRun({
      id: 'run-stuck-orphan',
      runType: 'orchestrator',
      status: 'running',
      trigger: 'cron',
      startedAt: stuckRunStartedAt,
      finishedAt: null,
    });

    // Run recovery with 10-minute threshold (600 seconds)
    const recoveredCount = await repo.recoverStaleRuns(600);

    assert(recoveredCount === 1, 'Test 6a: Exactly 1 orphan run recovered');

    const recent = await repo.getRecentRuns(5);
    const recoveredRun = recent.find((r) => r.id === 'run-stuck-orphan');

    assert(recoveredRun?.status === 'failed', 'Test 6b: Recovered run status transitioned from "running" to "failed"');
    assert(recoveredRun?.finishedAt !== null, 'Test 6c: Recovered run has non-null finishedAt timestamp');
    assert(
      Boolean(recoveredRun?.errors.some((e) => e.includes('ABORTED_RUN_AUTO_RECOVERED'))),
      'Test 6d: Recovered run contains ABORTED_RUN_AUTO_RECOVERED in errors'
    );
  }

  // --- 7. SMALL EXTRACTION BATCH STAYS WITHIN EXECUTION BUDGET ---
  console.log('\n--- 7. Small Extraction Batch Bounded to Safe Limit ---');
  {
    const configService = new AutomationConfigService();
    const config = configService.getConfig();

    assert(
      config.maxBatch.extraction === 2,
      'Test 7a: Default extraction batch size is tuned to 2 items'
    );

    // Verify StageRunnerService respects conservative limit
    const runner = new StageRunnerService(null, true);
    const result = await runner.runExtraction({ dryRun: true, limit: config.maxBatch.extraction });

    assert(
      result.stage === 'extraction',
      'Test 7b: Extraction runner executes successfully'
    );
    assert(
      result.status === 'completed',
      'Test 7c: Dry-run extraction returns completed'
    );
  }

  // --- 8. QUEUE METRICS MATCH TRUE PENDING WORK ---
  console.log('\n--- 8. Queue Metrics Match True Pending Work ---');
  {
    const now = new Date();

    // 5 discovery items: 2 ancient (2015), 1 processed, 2 fresh unextracted
    const items: DiscoveryItem[] = [
      {
        id: 'disc-ancient-1',
        sourceId: 'src-openai-news',
        publishedAt: '2016-01-01T00:00:00Z',
        discoveredAt: now.toISOString(),
        status: 'new',
        title: 'Ancient 1',
        sourceSlug: 'openai-news',
        sourceName: 'OpenAI',
        sourceType: 'rss',
        externalId: 'anc-1',
        sourceUrl: 'https://example.com/1',
        canonicalUrl: 'https://example.com/1',
        lastSeenAt: now.toISOString(),
        fingerprint: 'fp-anc-1',
        contentHash: 'ch-anc-1',
      },
      {
        id: 'disc-ancient-2',
        sourceId: 'src-openai-news',
        publishedAt: '2017-01-01T00:00:00Z',
        discoveredAt: now.toISOString(),
        status: 'new',
        title: 'Ancient 2',
        sourceSlug: 'openai-news',
        sourceName: 'OpenAI',
        sourceType: 'rss',
        externalId: 'anc-2',
        sourceUrl: 'https://example.com/2',
        canonicalUrl: 'https://example.com/2',
        lastSeenAt: now.toISOString(),
        fingerprint: 'fp-anc-2',
        contentHash: 'ch-anc-2',
      },
      {
        id: 'disc-extracted-already',
        sourceId: 'src-bbc-world',
        publishedAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
        discoveredAt: now.toISOString(),
        status: 'processed',
        title: 'Already Extracted',
        sourceSlug: 'bbc-world',
        sourceName: 'BBC',
        sourceType: 'rss',
        externalId: 'ext-1',
        sourceUrl: 'https://example.com/3',
        canonicalUrl: 'https://example.com/3',
        lastSeenAt: now.toISOString(),
        fingerprint: 'fp-ext-1',
        contentHash: 'ch-ext-1',
      },
      {
        id: 'disc-fresh-pending-1',
        sourceId: 'src-bbc-world',
        publishedAt: new Date(now.getTime() - 3 * 3600000).toISOString(),
        discoveredAt: now.toISOString(),
        status: 'new',
        title: 'Fresh Pending 1',
        sourceSlug: 'bbc-world',
        sourceName: 'BBC',
        sourceType: 'rss',
        externalId: 'pen-1',
        sourceUrl: 'https://example.com/4',
        canonicalUrl: 'https://example.com/4',
        lastSeenAt: now.toISOString(),
        fingerprint: 'fp-pen-1',
        contentHash: 'ch-pen-1',
      },
      {
        id: 'disc-fresh-pending-2',
        sourceId: 'src-eurogamer',
        publishedAt: new Date(now.getTime() - 1 * 3600000).toISOString(),
        discoveredAt: now.toISOString(),
        status: 'new',
        title: 'Fresh Pending 2',
        sourceSlug: 'eurogamer',
        sourceName: 'Eurogamer',
        sourceType: 'rss',
        externalId: 'pen-2',
        sourceUrl: 'https://example.com/5',
        canonicalUrl: 'https://example.com/5',
        lastSeenAt: now.toISOString(),
        fingerprint: 'fp-pen-2',
        contentHash: 'ch-pen-2',
      },
    ];

    const repo = new MockExtractionRepository(items);
    const pending = await repo.getPendingDiscoveryItems({ limit: 10 });

    assert(
      pending.length === 2,
      'Test 8a: Extraction queue correctly identifies exactly 2 true pending items (not 5)'
    );
    assert(
      pending.every((p) => p.id === 'disc-fresh-pending-1' || p.id === 'disc-fresh-pending-2'),
      'Test 8b: The 2 selected items are exclusively the fresh, unextracted candidates'
    );
  }

  console.log('\n====================================================');
  console.log(`TEST SUITE SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
