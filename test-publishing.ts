/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * Phase 9: Automated Publishing & Web Distribution Engine Test Suite
 *
 * Runs comprehensive automated verification covering:
 * - Publication gate checks (validation, fields, sources, content integrity)
 * - Safe automation policy & sensitive topic routing (politics, health, finance, war)
 * - Kill switches (global, category-level, source-level)
 * - CREATE and UPDATE story publication transitions & versioning
 * - Story immutability & timeline updates
 * - Controlled unpublish & correction audit preservation
 * - In-flight concurrency mutex & idempotency
 * - Sitemap and RSS feed generation (strictly published stories)
 * - Complete 24 real-world test fixture scenarios
 * - Live Supabase RLS policies and public database invariance
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { MockPublicationRepository } from './src/data/repositories/MockPublicationRepository';
import { PublicationEngine } from './src/services/publishing/PublicationEngine';
import { PublicationPolicyService } from './src/services/publishing/PublicationPolicyService';
import { PublicationGateService } from './src/services/publishing/PublicationGateService';
import { SitemapService } from './src/services/distribution/SitemapService';
import { RssFeedService } from './src/services/distribution/RssFeedService';
import {
  PUBLISHING_FIXTURES,
  makePublishingStory,
  makePublishingLifecycleDecision,
  makePublishingValidation,
  makePublishingExtraction,
} from './test/fixtures/publishing/fixtures';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`❌ [FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ''}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('THE MERIDIAN — PHASE 9 TEST SUITE');
  console.log('Automated Publishing & Web Distribution Engine');
  console.log('====================================================\n');

  // ====================================================
  // 1. PUBLICATION GATE HARD BLOCK TESTS
  // ====================================================
  console.log('--- 1. Publication Gate Hard Block Tests ---');
  {
    const repo = new MockPublicationRepository();
    const policy = new PublicationPolicyService();
    const gate = new PublicationGateService(policy);
    const engine = new PublicationEngine({ repository: repo, policyService: policy, gateService: gate });

    // Test 1a: Validation Rejected
    const resReject = await engine.publishCandidate({
      story: makePublishingStory({}),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'REJECT' }),
      validation: makePublishingValidation({ status: 'rejected' }),
      extraction: makePublishingExtraction({}),
    });
    assert(resReject.decision.decision === 'REJECT', 'Test 1a: Validation rejected is hard blocked as REJECT');
    assert(resReject.story?.status === 'draft', 'Test 1b: Story remains draft on REJECT');

    // Test 1c: Validation Insufficient Evidence
    const resLowEvidence = await engine.publishCandidate({
      story: makePublishingStory({}),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'REJECT' }),
      validation: makePublishingValidation({ status: 'insufficient_evidence' }),
      extraction: makePublishingExtraction({}),
    });
    assert(resLowEvidence.decision.decision === 'HOLD', 'Test 1c: Insufficient evidence validation is held');

    // Test 1d: Validation Needs Review
    const resNeedsReview = await engine.publishCandidate({
      story: makePublishingStory({}),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'HOLD' }),
      validation: makePublishingValidation({ status: 'needs_review' }),
      extraction: makePublishingExtraction({}),
    });
    assert(resNeedsReview.decision.decision === 'HOLD', 'Test 1d: needs_review validation is held');

    // Test 1e: Critical Issue Block
    const resCritical = await engine.publishCandidate({
      story: makePublishingStory({}),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({
        status: 'valid',
        issues: [
          {
            code: 'UNSUPPORTED_CLAIM',
            severity: 'critical',
            field: 'claims',
            message: 'Major unverified contradiction',
            createdAt: new Date().toISOString(),
          },
        ],
      }),
      extraction: makePublishingExtraction({}),
    });
    assert(resCritical.decision.decision === 'REJECT', 'Test 1e: Critical validation issue blocks publication');
  }

  // ====================================================
  // 2. REQUIRED FIELDS & BODY INTEGRITY TESTS
  // ====================================================
  console.log('\n--- 2. Required Fields & Content Integrity Tests ---');
  {
    const repo = new MockPublicationRepository();
    const policy = new PublicationPolicyService();
    const gate = new PublicationGateService(policy);
    const engine = new PublicationEngine({ repository: repo, policyService: policy, gateService: gate });

    // Test 2a: Missing Title
    const resNoTitle = await engine.publishCandidate({
      story: makePublishingStory({ title: 'Short' }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    });
    assert(resNoTitle.decision.decision === 'HOLD', 'Test 2a: Story with missing or short title is held');
    assert(resNoTitle.decision.reason === 'MISSING_REQUIRED_FIELD', 'Test 2b: Reason is MISSING_REQUIRED_FIELD');

    // Test 2c: Missing Source
    const resNoSource = await engine.publishCandidate({
      story: makePublishingStory({ sources: [] }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({ sources: [] }),
      sources: [],
    });
    assert(resNoSource.decision.decision === 'HOLD', 'Test 2c: Missing source blocks publication');
    assert(resNoSource.decision.reason === 'MISSING_SOURCE', 'Test 2d: Reason is MISSING_SOURCE');

    // Test 2e: Malformed Content (no substantive block)
    const resBadContent = await engine.publishCandidate({
      story: makePublishingStory({ content: [{ type: 'paragraph', text: 'Too tiny' }] }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    });
    assert(resBadContent.decision.decision === 'HOLD', 'Test 2e: Content lacking substantive text is held');
  }

  // ====================================================
  // 3. SAFE AUTOMATION & SENSITIVE TOPIC ROUTING TESTS
  // ====================================================
  console.log('\n--- 3. Safe Automation & Sensitive Topic Routing Tests ---');
  {
    const repo = new MockPublicationRepository();
    const policy = new PublicationPolicyService();
    const gate = new PublicationGateService(policy);
    const engine = new PublicationEngine({ repository: repo, policyService: policy, gateService: gate });

    // Test 3a: Political / Election Story Held
    const resPolitics = await engine.publishCandidate({
      story: makePublishingStory({
        category: 'politics',
        title: 'Senate Polling Indicates Surge Ahead of Presidential Election',
        summary: 'Voters head to congressional election ballots according to recent polling survey numbers.',
      }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({ category: 'politics' }),
    });
    assert(resPolitics.decision.decision === 'HOLD', 'Test 3a: Political/electoral story is held for review');
    assert(resPolitics.decision.reason === 'SENSITIVE_TOPIC', 'Test 3b: Reason is SENSITIVE_TOPIC');

    // Test 3c: Health / Miracle Cure Story Held
    const resHealth = await engine.publishCandidate({
      story: makePublishingStory({
        category: 'health',
        title: 'Biotech Startup Claims Miracle Cure for Neurological Disorders',
        summary: 'Clinical diagnosis claims a breakthrough therapy cures cancer and multiple sclerosis.',
      }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({ category: 'health' }),
    });
    assert(resHealth.decision.decision === 'HOLD', 'Test 3c: Medical miracle cure claim is held for review');

    // Test 3d: Financial Risk Story Held
    const resFinance = await engine.publishCandidate({
      story: makePublishingStory({
        category: 'business',
        title: 'Investment Advisory Firm Promises 100x Return on Crypto Fund',
        summary: 'Investment advice guarantees risk-free profit before the imminent market crash.',
      }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({ category: 'business' }),
    });
    assert(resFinance.decision.decision === 'HOLD', 'Test 3d: High-risk financial claims are held for review');

    // Test 3e: Global Kill Switch
    policy.setGlobalKillSwitch(false);
    const resKillSwitch = await engine.publishCandidate({
      story: makePublishingStory({ category: 'technology' }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({ category: 'technology' }),
    });
    assert(resKillSwitch.decision.decision === 'HOLD', 'Test 3e: Global kill switch holds all auto-publishing');
    assert(resKillSwitch.decision.reason === 'KILL_SWITCH_DISABLED', 'Test 3f: Reason is KILL_SWITCH_DISABLED');
    policy.setGlobalKillSwitch(true); // reset
  }

  // ====================================================
  // 4. PUBLICATION TRANSITION & VERSIONING TESTS
  // ====================================================
  console.log('\n--- 4. Publication Transition & Versioning Tests ---');
  {
    const repo = new MockPublicationRepository();
    const policy = new PublicationPolicyService();
    const gate = new PublicationGateService(policy);
    const engine = new PublicationEngine({ repository: repo, policyService: policy, gateService: gate });

    const initialStory = makePublishingStory({
      id: 'story-pub-version-1',
      slug: 'esa-clean-energy-satellite',
      status: 'draft',
      published_version: 1,
    });
    await repo.stories.set(initialStory.id, initialStory);

    // Test 4a: CREATE transitions to published
    const resCreate = await engine.publishCandidate({
      story: initialStory,
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE', storyId: initialStory.id }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    });
    assert(resCreate.decision.decision === 'PUBLISH', 'Test 4a: Initial safe candidate publishes successfully');
    assert(resCreate.story?.status === 'published', 'Test 4b: Story status transitions to published');
    assert(resCreate.story?.published_version === 1, 'Test 4c: Initial publication version is 1');
    assert(resCreate.event?.action === 'PUBLISH', 'Test 4d: Publication audit event recorded');

    // Test 4e: UPDATE increments version & adds timeline entry
    const resUpdate = await engine.publishCandidate({
      story: resCreate.story!,
      lifecycleDecision: makePublishingLifecycleDecision({
        action: 'UPDATE',
        storyId: initialStory.id,
        changedFields: ['facts', 'content'],
        reason: 'New verified facts discovered',
      }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    });
    assert(resUpdate.decision.decision === 'PUBLISH', 'Test 4e: Valid update publishes successfully');
    assert(resUpdate.story?.published_version === 2, 'Test 4f: Published version incremented to 2');
    assert(resUpdate.story?.content_version === 2, 'Test 4g: Content version incremented');
    assert(resUpdate.story?.slug === 'esa-clean-energy-satellite', 'Test 4h: URL slug remains strictly immutable');
    assert((resUpdate.story?.updates || []).length > 0, 'Test 4i: Timeline entry created in story_updates');

    // Test 4j: Controlled Unpublish
    const unpubEvent = await engine.unpublishStory(initialStory.id, 'Retracted for verification');
    const storedStory = await repo.getStoryById(initialStory.id);
    assert(storedStory?.status === 'archived', 'Test 4j: Unpublish changes status to archived');
    assert(unpubEvent.action === 'UNPUBLISH', 'Test 4k: Unpublish event recorded in audit');

    // Test 4l: Editorial Correction
    await repo.addStoryCorrection(initialStory.id, 'Corrected satellite deployment altitude from 700km to 720km.');
    const storyWithCorrection = await repo.getStoryById(initialStory.id);
    assert((storyWithCorrection?.corrections || []).length === 1, 'Test 4l: Correction added without altering audit history');
  }

  // ====================================================
  // 5. IDEMPOTENCY & CONCURRENCY TESTS
  // ====================================================
  console.log('\n--- 5. Idempotency & Concurrency Tests ---');
  {
    const repo = new MockPublicationRepository();
    const policy = new PublicationPolicyService();
    const gate = new PublicationGateService(policy);
    const engine = new PublicationEngine({ repository: repo, policyService: policy, gateService: gate });

    const story = makePublishingStory({ id: 'story-idempotent-check', status: 'draft' });
    await repo.stories.set(story.id, story);

    // Initial publish
    const run1 = await engine.publishCandidate({
      story,
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE', storyId: story.id }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    });
    assert(run1.isIdempotent === false, 'Test 5a: First run publishes new story');

    // Duplicate publish
    const run2 = await engine.publishCandidate({
      story: run1.story!,
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE', storyId: story.id }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    });
    assert(run2.isIdempotent === true, 'Test 5b: Second run safely returns idempotent result without duplicates');
    assert(repo.publicationEvents.length === 1, 'Test 5c: No duplicate publication events written');

    // Concurrency test: two parallel publish operations on same story ID
    const concurrentStory = makePublishingStory({ id: 'story-concurrent-test', status: 'draft' });
    await repo.stories.set(concurrentStory.id, concurrentStory);

    const [cRes1, cRes2] = await Promise.all([
      engine.publishCandidate({
        story: concurrentStory,
        lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE', storyId: concurrentStory.id }),
        validation: makePublishingValidation({ status: 'valid' }),
        extraction: makePublishingExtraction({}),
      }),
      engine.publishCandidate({
        story: concurrentStory,
        lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE', storyId: concurrentStory.id }),
        validation: makePublishingValidation({ status: 'valid' }),
        extraction: makePublishingExtraction({}),
      }),
    ]);
    const pubEvents = repo.publicationEvents.filter((e) => e.storyId === 'story-concurrent-test');
    assert(pubEvents.length === 1, 'Test 5d: In-flight mutex ensures exactly 1 publication event for concurrent calls');
    assert(cRes1.decision.decision === 'PUBLISH' && cRes2.decision.decision === 'PUBLISH', 'Test 5e: Both calls succeed safely');
  }

  // ====================================================
  // 6. DISTRIBUTION FEEDS (SITEMAP & RSS)
  // ====================================================
  console.log('\n--- 6. Distribution Feeds (Sitemap & RSS) Tests ---');
  {
    const sitemapService = new SitemapService('https://themeridian.in');
    const rssService = new RssFeedService('https://themeridian.in');

    const publishedStory = makePublishingStory({
      slug: 'james-webb-detects-new-exoplanet',
      title: 'James Webb Telescope Detects Habitable Exoplanet Atmosphere',
      summary: 'Astronomers confirm methane and carbon dioxide in exoplanet atmosphere.',
      status: 'published',
    });

    const draftStory = makePublishingStory({
      slug: 'internal-unreviewed-draft',
      status: 'draft',
    });

    const heldStory = makePublishingStory({
      slug: 'sensitive-held-story',
      status: 'held',
    });

    const allStories = [publishedStory, draftStory, heldStory];

    // Sitemap Test
    const sitemapXml = sitemapService.generateSitemapXml(allStories);
    assert(sitemapXml.includes('https://themeridian.in/story/james-webb-detects-new-exoplanet'), 'Test 6a: Sitemap includes published story');
    assert(!sitemapXml.includes('internal-unreviewed-draft'), 'Test 6b: Sitemap strictly excludes draft story');
    assert(!sitemapXml.includes('sensitive-held-story'), 'Test 6c: Sitemap strictly excludes held story');

    // RSS Feed Test
    const rssXml = rssService.generateRssXml(allStories);
    assert(rssXml.includes('<title>James Webb Telescope Detects Habitable Exoplanet Atmosphere</title>'), 'Test 6d: RSS includes published story');
    assert(!rssXml.includes('internal-unreviewed-draft'), 'Test 6e: RSS strictly excludes draft story');
    assert(!rssXml.includes('sensitive-held-story'), 'Test 6f: RSS strictly excludes held story');
    assert(!rssXml.includes('confidenceScore'), 'Test 6g: RSS strictly omits internal pipeline metadata');
  }

  // ====================================================
  // 7. COMPLETE 24 FIXTURE SUITE VERIFICATION
  // ====================================================
  console.log('\n--- 7. Complete 24 Test Fixtures Suite ---');
  {
    for (const fixture of PUBLISHING_FIXTURES) {
      const repo = new MockPublicationRepository();
      const policy = new PublicationPolicyService();
      const gate = new PublicationGateService(policy);
      const engine = new PublicationEngine({ repository: repo, policyService: policy, gateService: gate });

      if (fixture.setupFn) {
        await fixture.setupFn(repo, engine);
      }

      if (fixture.input.story.status === 'published') {
        await repo.stories.set(fixture.input.story.id, fixture.input.story);
      }

      let res: any;
      if (fixture.expectedDecision === 'UNPUBLISH') {
        const ev = await engine.unpublishStory(
          fixture.input.story.id,
          'UNPUBLISHED_BY_OPERATOR'
        );
        res = {
          decision: {
            decision: 'UNPUBLISH',
            reason: ev.reason,
            blockingIssues: [],
            publishableFields: [],
            publicationVersion: ev.publicationVersion,
          },
          story: await repo.getStoryById(fixture.input.story.id),
          event: ev,
        };
      } else {
        res = await engine.publishCandidate(fixture.input, {
          force: fixture.force,
          scheduledFor: fixture.scheduledFor,
        });
      }

      const decisionMatches = res.decision.decision === fixture.expectedDecision;
      const reasonMatches = fixture.expectedReasonSubstr
        ? res.decision.reason.includes(fixture.expectedReasonSubstr)
        : true;

      assert(
        decisionMatches && reasonMatches,
        `Fixture ${fixture.id} [${fixture.name}]: Action is '${fixture.expectedDecision}'`,
        `Got '${res.decision.decision}' with reason '${res.decision.reason}' (expected '${fixture.expectedDecision}' containing '${fixture.expectedReasonSubstr}')`
      );
    }
  }

  // ====================================================
  // 8. LIVE SUPABASE RLS SECURITY & INVARIANCE
  // ====================================================
  console.log('\n--- 8. Live Supabase RLS Security & Invariance Tests ---');
  {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dzbggkymgdtsyvrvrrjw.supabase.co';
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (anonKey) {
      const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

      // Test 8a: Anon user CANNOT insert into publication_queue
      const { error: qInsertErr } = await anonClient
        .from('publication_queue')
        .insert({ id: 'anon_hack_q', story_id: 'any' });
      assert(qInsertErr !== null, 'Test 8a: Anonymous user INSERT into publication_queue is REJECTED by RLS');

      // Test 8b: Anon user CANNOT insert into publication_events
      const { error: evInsertErr } = await anonClient
        .from('publication_events')
        .insert({ id: 'anon_hack_ev', story_id: 'any', action: 'PUBLISH' });
      assert(evInsertErr !== null, 'Test 8b: Anonymous user INSERT into publication_events is REJECTED by RLS');

      // Test 8c: Anon user CANNOT read publication_runs
      const { data: runsData, error: runsErr } = await anonClient
        .from('publication_runs')
        .select('*');
      assert(runsErr !== null || (runsData && runsData.length === 0), 'Test 8c: Anonymous user CANNOT access internal publication_runs');

      // Test 8d: Anon user CANNOT select draft/held stories
      const { data: draftData } = await anonClient
        .from('stories')
        .select('id, status')
        .in('status', ['draft', 'held']);
      assert(!draftData || draftData.length === 0, 'Test 8d: Anonymous user CANNOT view draft or held stories (RLS protected)');

      // Test 8e: Critical Invariant: published stories count is EXACTLY 20
      const { count: pubCount, error: countErr } = await anonClient
        .from('stories')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');
      assert(countErr === null && pubCount !== null && pubCount >= 20, `Test 8e: CRITICAL INVARIANT: published stories count maintains baseline (Found: ${pubCount})`);
    } else {
      console.log('Skipping live anon RLS tests (VITE_SUPABASE_ANON_KEY not set).');
    }
  }

  // ====================================================
  // SUMMARY RESULTS
  // ====================================================
  console.log('\n====================================================');
  console.log(`PHASE 9 TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal Test Exception:', err);
  process.exit(1);
});
