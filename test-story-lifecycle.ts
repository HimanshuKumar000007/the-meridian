/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE MERIDIAN — PHASE 8 AUTOMATED VERIFICATION SUITE
 * Universal Story Lifecycle Engine Verification
 */

import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import {
  StoryClusteringService,
  StoryMatchingEngine,
  StoryMergePolicy,
  StoryLifecycleEngine,
  CURRENT_LIFECYCLE_VERSION,
} from './src/services/lifecycle';
import { MockLifecycleRepository } from './src/data/repositories/MockLifecycleRepository';
import { SupabaseLifecycleRepository } from './src/data/repositories/SupabaseLifecycleRepository';
import {
  getSupabaseClient,
  getSupabaseServiceClient,
  isSupabaseConfigured,
  isServiceRoleConfigured,
} from './src/lib/supabase';
import {
  LIFECYCLE_FIXTURES,
  makeTestCandidate,
  makeTestValidation,
} from './test/fixtures/lifecycles/fixtures';

async function runPhase8TestSuite() {
  console.log('====================================================');
  console.log('THE MERIDIAN — PHASE 8 TEST SUITE');
  console.log('Universal Story Lifecycle Engine Verification');
  console.log('====================================================\n');

  let testsPassed = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ [FAIL] ${testName}${details ? ` - ${details}` : ''}`);
      throw new Error(`Test failed: ${testName}`);
    }
    console.log(`✅ [PASS] ${testName}${details ? ` (${details})` : ''}`);
    testsPassed++;
  }

  const mockRepo = new MockLifecycleRepository();
  const clusteringService = new StoryClusteringService();
  const matchingEngine = new StoryMatchingEngine(clusteringService);
  const mergePolicy = new StoryMergePolicy(matchingEngine);
  const engine = new StoryLifecycleEngine(mockRepo, {
    clusteringService,
    matchingEngine,
    mergePolicy,
  });

  // ----------------------------------------------------
  // TEST 1: Validation Hard Gate
  // ----------------------------------------------------
  console.log('--- 1. Validation Hard Gate Tests ---');
  const rejCandidate = makeTestCandidate({ id: 'ext_rej_gate' });
  const rejVal = makeTestValidation({ status: 'rejected' });
  const rejDec = await engine.processCandidate(rejCandidate, rejVal);
  assert(rejDec.action === 'REJECT', 'Test 1a: Rejected validation is hard-gated with action REJECT');
  assert(mockRepo.stories.size === 0, 'Test 1b: No story created for rejected candidate');

  const insuffCandidate = makeTestCandidate({ id: 'ext_insuff_gate' });
  const insuffVal = makeTestValidation({ status: 'insufficient_evidence' });
  const insuffDec = await engine.processCandidate(insuffCandidate, insuffVal);
  assert(insuffDec.action === 'REJECT', 'Test 1c: Insufficient evidence validation is hard-gated with action REJECT');
  assert(mockRepo.stories.size === 0, 'Test 1d: No story created for insufficient evidence candidate');

  const holdCandidate = makeTestCandidate({ id: 'ext_hold_gate' });
  const holdVal = makeTestValidation({ status: 'needs_review' });
  const holdDec = await engine.processCandidate(holdCandidate, holdVal);
  assert(holdDec.action === 'HOLD', 'Test 1e: needs_review validation is held in queue with action HOLD');
  assert(mockRepo.stories.size === 0, 'Test 1f: No story created for needs_review candidate');

  // ----------------------------------------------------
  // TEST 2: Story Fingerprint & Deterministic Clustering
  // ----------------------------------------------------
  console.log('\n--- 2. Deterministic Story Clustering Tests ---');
  const candA = makeTestCandidate({
    title: 'NVIDIA Announces Blackwell Ultra GPUs',
    summary: 'NVIDIA launches Blackwell Ultra AI accelerators with enhanced HBM3e memory.',
    category: 'tech',
    entities: [{ name: 'NVIDIA', type: 'company', relevance: 0.99 }],
    publishedAt: '2026-09-20T10:00:00Z',
  });
  const keyA = clusteringService.generateClusterKey(candA);
  assert(keyA.includes('nvidia') && keyA.includes('launch'), 'Test 2a: Cluster key captures entity and event type');

  const candB = makeTestCandidate({
    title: 'NVIDIA Unveils Blackwell Ultra Accelerators at GTC',
    summary: 'At GTC keynote, NVIDIA revealed Blackwell Ultra hardware.',
    category: 'tech',
    entities: [{ name: 'NVIDIA', type: 'company', relevance: 0.99 }],
    publishedAt: '2026-09-20T14:00:00Z',
  });
  const keyB = clusteringService.generateClusterKey(candB);
  assert(keyA === keyB, 'Test 2b: Different publishers of the same event generate identical cluster key');

  // ----------------------------------------------------
  // TEST 3: Over-Merge Prevention (Same Entity, Different Events)
  // ----------------------------------------------------
  console.log('\n--- 3. Over-Merge Prevention Tests ---');
  const appleLaunch = makeTestCandidate({
    title: 'Apple Launches Next-Generation M5 Pro MacBooks',
    summary: 'Apple announced new MacBook Pro models powered by M5 Pro processors.',
    category: 'tech',
    entities: [{ name: 'Apple', type: 'company', relevance: 0.99 }],
    publishedAt: '2026-09-22T10:00:00Z',
  });
  const appleEarnings = makeTestCandidate({
    title: 'Apple Reports Fourth Quarter Earnings and Revenue Growth',
    summary: 'Apple reported quarterly revenue of $94.9 billion for its fourth fiscal quarter.',
    category: 'business',
    entities: [{ name: 'Apple', type: 'company', relevance: 0.99 }],
    publishedAt: '2026-09-22T18:00:00Z',
  });

  const keyLaunch = clusteringService.generateClusterKey(appleLaunch);
  const keyEarnings = clusteringService.generateClusterKey(appleEarnings);
  assert(keyLaunch !== keyEarnings, 'Test 3a: Same company with different event types generates distinct clusters');

  const decLaunch = await engine.processCandidate(appleLaunch, makeTestValidation({ status: 'valid' }));
  const decEarnings = await engine.processCandidate(appleEarnings, makeTestValidation({ status: 'valid' }));
  assert(decLaunch.action === 'CREATE' && decEarnings.action === 'CREATE', 'Test 3b: Both separate events create independent stories');
  assert(decLaunch.storyId !== decEarnings.storyId, 'Test 3c: Stories have distinct IDs (not over-merged)');

  // ----------------------------------------------------
  // TEST 4: Initial Story Creation & Status Draft Invariant
  // ----------------------------------------------------
  console.log('\n--- 4. Story Creation & Draft Status Invariant ---');
  const createdStory = mockRepo.stories.get(decLaunch.storyId!);
  assert(createdStory !== undefined, 'Test 4a: Created story is stored in repository');
  assert(createdStory?.status === 'draft', 'Test 4b: Created story status is strictly draft (NEVER auto-published)');
  assert(createdStory?.content_version === 1, 'Test 4c: Initial content version is 1');
  assert(createdStory?.cluster_id !== undefined, 'Test 4d: Story is properly linked to its cluster');

  // ----------------------------------------------------
  // TEST 5: Meaningful Updates vs No-Ops
  // ----------------------------------------------------
  console.log('\n--- 5. Meaningful Updates vs No-Ops Tests ---');
  // 5a: Duplicate report of M5 MacBooks with no new information -> NO_OP
  const dupLaunch = makeTestCandidate({
    title: 'Apple Unveils M5 Pro MacBook Laptops',
    summary: 'Apple announced new MacBook Pro models powered by M5 Pro processors.',
    category: 'tech',
    entities: [{ name: 'Apple', type: 'company', relevance: 0.99 }],
    sources: [{ name: 'MacRumors', url: 'https://macrumors.com/m5-macbook' }],
    publishedAt: '2026-09-22T11:00:00Z',
  });
  const decNoOp = await engine.processCandidate(dupLaunch, makeTestValidation({ status: 'valid' }));
  assert(decNoOp.action === 'NO_OP', 'Test 5a: Identical event report resolves to NO_OP');
  assert(decNoOp.storyId === decLaunch.storyId, 'Test 5b: Matches the existing story ID');

  // 5b: Candidate with new verified fact (pricing confirmed) -> UPDATE
  const updateCandidate = makeTestCandidate({
    title: 'Apple Confirms M5 Pro MacBook Pricing and Retail Availability',
    summary: 'Apple announced new MacBook Pro models and confirmed starting pricing at $1,999 with October 10 availability.',
    category: 'tech',
    entities: [{ name: 'Apple', type: 'company', relevance: 0.99 }],
    facts: [
      { label: 'Starting Price', value: '$1,999', evidence: '', confidence: 0.98 },
      { label: 'Retail Availability', value: 'October 10', evidence: '', confidence: 0.97 },
    ],
    sources: [{ name: 'CNBC', url: 'https://cnbc.com/apple-m5-pricing' }],
    publishedAt: '2026-09-22T14:00:00Z',
  });
  const decUpdate = await engine.processCandidate(updateCandidate, makeTestValidation({ status: 'valid' }));
  assert(decUpdate.action === 'UPDATE', 'Test 5c: Meaningful new verified facts resolve to UPDATE');
  assert(decUpdate.storyId === decLaunch.storyId, 'Test 5d: Update targets the same existing story');

  const updatedStory = mockRepo.stories.get(decLaunch.storyId!);
  assert(updatedStory?.content_version === 2, 'Test 5e: Content version incremented to 2');
  assert(updatedStory?.slug === createdStory?.slug, 'Test 5f: Story slug remains strictly stable across updates');

  const storyUpdates = mockRepo.updates.get(decLaunch.storyId!) || [];
  assert(storyUpdates.length === 1, 'Test 5g: Meaningful update generated a timeline update entry in story_updates');

  // ----------------------------------------------------
  // TEST 6: Idempotency Verification
  // ----------------------------------------------------
  console.log('\n--- 6. Idempotency Verification ---');
  const idempCandidate = makeTestCandidate({ id: 'ext_idemp_test' });
  const idempVal = makeTestValidation({ id: 'val_idemp_test', status: 'valid' });

  const firstExec = await engine.processCandidate(idempCandidate, idempVal);
  const secondExec = await engine.processCandidate(idempCandidate, idempVal);
  assert(firstExec.id === secondExec.id, 'Test 6a: Idempotent runs produce identical lifecycle decision ID');
  assert(firstExec.action === secondExec.action, 'Test 6b: Idempotent runs return the exact same action');

  // ----------------------------------------------------
  // TEST 7: Concurrency Simulation (Parallel Same-Event Processing)
  // ----------------------------------------------------
  console.log('\n--- 7. Concurrency Safety Simulation ---');
  const concurrentA = makeTestCandidate({
    id: 'ext_concurrent_a',
    title: 'James Webb Detects Water Vapor on Terrestrial Exoplanet',
    summary: 'Astronomers detected atmospheric water vapor signatures on exoplanet LHS 1140 b.',
    category: 'science',
    entities: [{ name: 'James Webb', type: 'technology', relevance: 0.98 }],
  });
  const concurrentB = makeTestCandidate({
    id: 'ext_concurrent_b',
    title: 'Webb Space Telescope Identifies Exoplanet Atmosphere Water Signals',
    summary: 'Astronomers confirmed atmospheric water vapor signatures on LHS 1140 b.',
    category: 'science',
    entities: [{ name: 'James Webb', type: 'technology', relevance: 0.98 }],
  });

  const [resA, resB] = await Promise.all([
    engine.processCandidate(concurrentA, makeTestValidation({ extractionId: 'ext_concurrent_a', status: 'valid' })),
    engine.processCandidate(concurrentB, makeTestValidation({ extractionId: 'ext_concurrent_b', status: 'valid' })),
  ]);

  const actions = [resA.action, resB.action].sort();
  assert(
    (actions[0] === 'CREATE' && (actions[1] === 'NO_OP' || actions[1] === 'UPDATE')) ||
    (resA.storyId === resB.storyId),
    'Test 7: Concurrent candidates for same event resolve to exactly 1 CREATE, with no duplicate stories'
  );

  // ----------------------------------------------------
  // TEST 8: Full 20 Test Fixtures Verification
  // ----------------------------------------------------
  console.log('\n--- 8. Complete 20 Test Fixtures Suite ---');
  let fixtureIdx = 1;
  for (const fix of LIFECYCLE_FIXTURES) {
    const decision = await engine.processCandidate(fix.candidate, fix.validation, {
      forceRerun: fix.id.includes('idempotent') ? false : true,
    });
    assert(
      decision.action === fix.expectedAction,
      `Fixture ${fixtureIdx} [${fix.id}]: Action is '${fix.expectedAction}'`,
      `Got action '${decision.action}', reason: ${decision.reason}`
    );

    if (fix.expectedMatchReason) {
      assert(
        decision.matchReason === fix.expectedMatchReason,
        `Fixture ${fixtureIdx} [${fix.id}]: Match reason is '${fix.expectedMatchReason}'`,
        `Got matchReason '${decision.matchReason}'`
      );
    }
    fixtureIdx++;
  }

  // ----------------------------------------------------
  // TEST 9: Live Supabase RLS & Security Verification
  // ----------------------------------------------------
  if (isSupabaseConfigured()) {
    console.log('\n--- 9. Verifying Live Supabase Security & Invariance ---');
    const anonClient = getSupabaseClient();
    const serviceClient = isServiceRoleConfigured() ? getSupabaseServiceClient() : anonClient;

    // 1. Verify Anonymous User CANNOT insert into stories
    const { error: insertErr } = await anonClient.from('stories').insert({
      id: 'hack_story_anon',
      slug: 'hack-story-anon',
      title: 'Hacked Story',
      summary: 'Hacked summary',
      category_id: 'cat-tech',
      author_id: 'auth-helen-vance',
      status: 'published',
    });
    assert(insertErr !== null, 'Test 9a: Anonymous user INSERT into stories is REJECTED by RLS');

    // 2. Verify Anonymous User CANNOT update stories
    const { error: updateErr } = await anonClient.from('stories').update({
      title: 'Hacked Title',
    }).eq('slug', 'quantum-supremacy-benchmark-achieved');
    assert(updateErr !== null, 'Test 9b: Anonymous user UPDATE on stories is REJECTED by RLS');

    // 3. Verify Anonymous User CANNOT delete from stories
    const { error: deleteErr } = await anonClient.from('stories').delete().eq('id', 'story-01');
    assert(deleteErr !== null, 'Test 9c: Anonymous user DELETE on stories is REJECTED by RLS');

    // 4. Verify Anonymous User CANNOT read draft stories
    const { data: anonDrafts, error: draftErr } = await anonClient
      .from('stories')
      .select('id')
      .eq('status', 'draft');
    assert(
      draftErr !== null || (anonDrafts && anonDrafts.length === 0),
      'Test 9d: Anonymous user CANNOT read draft stories (RLS draft insulation)'
    );

    // 5. Verify Internal Tables RLS Denial
    const { data: clusterData, error: clusterErr } = await anonClient
      .from('story_clusters')
      .select('*')
      .limit(1);
    assert(
      clusterErr !== null || (clusterData && clusterData.length === 0),
      'Test 9e: Anonymous user CANNOT select from story_clusters (RLS secured)'
    );

    const { data: eventData, error: eventErr } = await anonClient
      .from('story_lifecycle_events')
      .select('*')
      .limit(1);
    assert(
      eventErr !== null || (eventData && eventData.length === 0),
      'Test 9f: Anonymous user CANNOT select from story_lifecycle_events (RLS secured)'
    );

    // 6. CRITICAL PUBLISHED INVARIANT: Exactly 19 Published Stories
    const { count: publishedCount, error: countErr } = await serviceClient
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');

    assert(
      countErr === null && publishedCount === 19,
      'Test 9g: CRITICAL INVARIANT: published stories count is EXACTLY 19 (NEVER modified by Phase 8)'
    );
  } else {
    console.log('ℹ️  Supabase credentials not configured, skipped live DB tests.');
  }

  console.log('\n====================================================');
  console.log(`PHASE 8 TEST RESULTS: ${testsPassed} / ${totalTests} TESTS PASSED (100%)`);
  console.log('====================================================\n');
}

runPhase8TestSuite().catch((err) => {
  console.error('\n❌ Phase 8 Test Suite Aborted with Error:', err);
  process.exit(1);
});
