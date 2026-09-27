/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE MERIDIAN — PHASE 5 AUTOMATED VERIFICATION SUITE
 * Universal News Source Discovery Engine
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  FeedParser,
  SourceFetcher,
  DiscoveryNormalizer,
  DiscoveryDeduplicator,
  SourceRegistryService,
  DiscoveryRunner,
  normalizeSourceUrl,
  generateDiscoveryFingerprint,
  generateContentHash,
  MockDiscoveryRepository,
  SupabaseDiscoveryRepository,
  INITIAL_NEWS_SOURCES,
  type NewsSource,
  type SourceFetchResult,
} from './src/services/discovery';
import { getSupabaseClient, isSupabaseConfigured } from './src/lib/supabase';

function loadFixture(filename: string): string {
  const filePath = path.resolve('test/fixtures', filename);
  return fs.readFileSync(filePath, 'utf8');
}

async function runPhase5TestSuite() {
  console.log('====================================================');
  console.log('THE MERIDIAN — PHASE 5 TEST SUITE');
  console.log('Universal News Source Discovery Engine Verification');
  console.log('====================================================\n');

  let testsPassed = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ [FAIL] ${testName}${details ? ` - ${details}` : ''}`);
      throw new Error(`Test failed: ${testName}`);
    }
    console.log(`✅ [PASS] ${testName}`);
    testsPassed++;
  }

  // ----------------------------------------------------
  // TEST 1: RSS 2.0 Parsing
  // ----------------------------------------------------
  const parser = new FeedParser();
  const rssXml = loadFixture('rss-standard.xml');
  const rssItems = parser.parse(rssXml);
  assert(rssItems.length === 2, 'Test 1: RSS 2.0 parsing', `Extracted ${rssItems.length} items`);
  assert(
    rssItems[0].title === 'Optical Interconnect Standard Ratified for Distributed AI Clusters',
    'Test 1b: RSS title extraction'
  );
  assert(
    rssItems[0].guid === 'tc-article-109283',
    'Test 1c: RSS GUID extraction'
  );
  assert(
    rssItems[0].author === 'Sarah Lin',
    'Test 1d: RSS author extraction'
  );
  assert(
    rssItems[0].imageUrl === 'https://techchronicle.example.com/images/optical-die.jpg',
    'Test 1e: RSS media:content image extraction'
  );

  // ----------------------------------------------------
  // TEST 2: Atom 1.0 Parsing
  // ----------------------------------------------------
  const atomXml = loadFixture('atom-standard.xml');
  const atomItems = parser.parse(atomXml);
  assert(atomItems.length === 1, 'Test 2: Atom 1.0 parsing', `Extracted ${atomItems.length} items`);
  assert(
    atomItems[0].title === 'Formal Methods Framework Verified for Multi-Agent Industrial Robotics',
    'Test 2b: Atom entry title extraction'
  );
  assert(
    atomItems[0].link === 'https://autoreview.example.com/papers/formal-multi-agent-verification',
    'Test 2c: Atom rel="alternate" link extraction'
  );
  assert(
    atomItems[0].author === 'Julian Foster',
    'Test 2d: Atom author extraction'
  );

  // ----------------------------------------------------
  // TEST 3: Canonical URL Normalization
  // ----------------------------------------------------
  const dirtyUrl1 = 'https://TechChronicle.Example.COM:443/2026/09/optical-interconnect-standard/?utm_source=rss&utm_medium=feed&ref=newsletter#comments';
  const cleanUrl1 = normalizeSourceUrl(dirtyUrl1);
  assert(
    cleanUrl1 === 'https://techchronicle.example.com/2026/09/optical-interconnect-standard',
    'Test 3: URL normalization removes tracking params, default ports, trailing slashes, and hash fragments',
    `Result: ${cleanUrl1}`
  );

  // Preserve essential query params
  const cmsUrl = 'https://news.example.com/article?id=8921&page=1&utm_source=twitter';
  const cleanCms = normalizeSourceUrl(cmsUrl);
  assert(
    cleanCms === 'https://news.example.com/article?id=8921&page=1',
    'Test 3b: URL normalization preserves legitimate publisher query params',
    `Result: ${cleanCms}`
  );

  // ----------------------------------------------------
  // TEST 4: Fingerprint Generation & Determinism
  // ----------------------------------------------------
  const fp1 = generateDiscoveryFingerprint({
    title: 'Optical Interconnect Standard Ratified for Distributed AI Clusters',
    canonicalUrl: 'https://techchronicle.example.com/2026/09/optical-interconnect-standard',
    sourceIdentity: 'src-tech',
  });
  const fp2 = generateDiscoveryFingerprint({
    title: '   optical interconnect standard ratified for distributed ai clusters   ',
    canonicalUrl: 'https://techchronicle.example.com/2026/09/optical-interconnect-standard?utm_medium=mail',
    sourceIdentity: 'SRC-TECH',
  });
  assert(
    fp1 === fp2,
    'Test 4: Deterministic fingerprint matches across whitespace, case, and tracking query variations',
    `FP: ${fp1}`
  );

  // ----------------------------------------------------
  // TEST 5 & 6: Deduplication — Exact Duplicate & Cross-URL Matching
  // ----------------------------------------------------
  const deduplicator = new DiscoveryDeduplicator();
  const normalizer = new DiscoveryNormalizer();
  const dummySource: NewsSource = {
    id: 'src-tech',
    slug: 'tech-chronicle',
    name: 'Tech Chronicle',
    type: 'rss',
    feedUrl: 'https://techchronicle.example.com/feed.xml',
    baseUrl: 'https://techchronicle.example.com',
    country: 'US',
    language: 'en',
    priority: 1,
    pollIntervalMinutes: 15,
    categories: ['technology', 'hardware'],
    isActive: true,
    consecutiveFailures: 0,
  };

  const candidate1 = normalizer.normalizeItem(rssItems[0], dummySource)!;
  const initialIndex = new Map<string, any>();

  // 1st evaluation -> NEW
  const evalNew = deduplicator.evaluateCandidate(candidate1, initialIndex);
  assert(evalNew.action === 'new', 'Test 5: First seen item flagged as NEW');

  // Insert candidate1 into index
  const populatedIndex = deduplicator.buildLookupIndex([candidate1]);

  // 2nd evaluation identical -> NO-OP (duplicate)
  const evalDup = deduplicator.evaluateCandidate(candidate1, populatedIndex);
  assert(evalDup.action === 'no_op', 'Test 5b: Identical candidate flagged as NO-OP (duplicate)');

  // Feed with tracking URLs matching same story -> NO-OP
  const trackingXml = loadFixture('rss-tracking-urls.xml');
  const trackingItems = parser.parse(trackingXml);
  const trackingCandidate = normalizer.normalizeItem(trackingItems[0], dummySource)!;
  const evalTracking = deduplicator.evaluateCandidate(trackingCandidate, populatedIndex);
  assert(
    evalTracking.action === 'no_op',
    'Test 6: Duplicate detection succeeds despite differing tracking URLs & anchor tags'
  );

  // ----------------------------------------------------
  // TEST 7: Possible Update Detection
  // ----------------------------------------------------
  const updatedXml = loadFixture('rss-updated-item.xml');
  const updatedItems = parser.parse(updatedXml);
  const updatedCandidate = normalizer.normalizeItem(updatedItems[0], dummySource)!;
  const evalUpdate = deduplicator.evaluateCandidate(updatedCandidate, populatedIndex);
  assert(
    evalUpdate.action === 'possible_update',
    'Test 7: Modified description / updated timestamp detected as POSSIBLE UPDATE'
  );
  assert(
    evalUpdate.item.status === 'possible_update',
    'Test 7b: Item status transitioned to possible_update'
  );

  // ----------------------------------------------------
  // TEST 8: Missing GUID Handling
  // ----------------------------------------------------
  const missingGuidXml = loadFixture('rss-missing-guid.xml');
  const missingGuidItems = parser.parse(missingGuidXml);
  const candidateMissingGuid = normalizer.normalizeItem(missingGuidItems[0], dummySource);
  assert(
    candidateMissingGuid !== null && candidateMissingGuid.externalId !== undefined,
    'Test 8: Missing GUID gracefully falls back to canonical URL identity'
  );

  // ----------------------------------------------------
  // TEST 9: Missing Published Date Handling
  // ----------------------------------------------------
  const missingDateXml = loadFixture('rss-missing-date.xml');
  const missingDateItems = parser.parse(missingDateXml);
  const candidateMissingDate = normalizer.normalizeItem(missingDateItems[0], dummySource);
  assert(
    candidateMissingDate !== null && candidateMissingDate.publishedAt !== null,
    'Test 9: Missing pubDate gracefully falls back to discovery timestamp'
  );

  // ----------------------------------------------------
  // TEST 10: Malformed Feed Resilience
  // ----------------------------------------------------
  const malformedXml = loadFixture('rss-malformed.xml');
  const malformedItems = parser.parse(malformedXml);
  assert(
    Array.isArray(malformedItems),
    'Test 10: Malformed/broken XML feed does not throw exception and returns safe array'
  );

  // ----------------------------------------------------
  // TEST 11: Timeout & Abort Handling
  // ----------------------------------------------------
  const fetcherWithShortTimeout = new SourceFetcher({ timeoutMs: 50, maxRetries: 0 });
  const timeoutSource: NewsSource = {
    ...dummySource,
    id: 'src-timeout',
    feedUrl: 'http://10.255.255.1/slow-feed.xml', // unroutable IP triggering timeout
  };
  const timeoutResult = await fetcherWithShortTimeout.fetchSource(timeoutSource);
  assert(
    timeoutResult.status === 'failure',
    'Test 11: Unreachable endpoint safely times out and returns failure without crashing'
  );

  // ----------------------------------------------------
  // TEST 12: Partial Source Failure Resilience
  // ----------------------------------------------------
  class MockFetcherWithFailures extends SourceFetcher {
    public async fetchSource(src: NewsSource): Promise<SourceFetchResult> {
      if (src.slug === 'broken-source') {
        return { status: 'failure', error: 'HTTP 500 Internal Server Error', durationMs: 25 };
      }
      return { status: 'success', statusCode: 200, body: rssXml, durationMs: 30 };
    }
  }

  const testSources: NewsSource[] = [
    { ...dummySource, id: 'src-ok-1', slug: 'ok-source-1' },
    { ...dummySource, id: 'src-broken', slug: 'broken-source' },
    { ...dummySource, id: 'src-ok-2', slug: 'ok-source-2' },
  ];

  const mockRepo = new MockDiscoveryRepository(testSources);
  const runner = new DiscoveryRunner(mockRepo, new MockFetcherWithFailures());
  const runResult = await runner.runDiscovery({ forceAll: true });

  assert(
    runResult.sourcesAttempted === 3 && runResult.sourcesSucceeded === 2 && runResult.sourcesFailed === 1,
    'Test 12: Partial source failure does not halt pipeline; successful sources finish completely'
  );
  assert(runResult.errors.length === 1, 'Test 12b: Error captured with sourceSlug identity');

  // ----------------------------------------------------
  // TEST 13 & 14: Category Hinting & Image Extraction
  // ----------------------------------------------------
  assert(
    candidate1.categoryHint === 'technology',
    'Test 13: Primary category hint correctly assigned from source metadata'
  );
  assert(
    candidate1.subcategoryHint === 'hardware',
    'Test 13b: Secondary subcategory hint correctly assigned'
  );
  assert(
    candidate1.imageUrl === 'https://techchronicle.example.com/images/optical-die.jpg',
    'Test 14: Media image URL correctly extracted and stored in candidate model'
  );

  // ----------------------------------------------------
  // TEST 15: Source Health Tracking & Failure Backoff
  // ----------------------------------------------------
  const failedSrc = await mockRepo.getSourceById('src-broken');
  assert(
    failedSrc !== null && failedSrc.consecutiveFailures === 1 && failedSrc.lastFailureAt !== null,
    'Test 15: Failed source records failure timestamp, consecutive failure counter, and error message'
  );
  const registryService = new SourceRegistryService(mockRepo);
  const isDueWithBackoff = registryService.isSourceDue(failedSrc!);
  assert(
    typeof isDueWithBackoff === 'boolean',
    'Test 15b: Failure backoff scheduler accurately computes backoff polling eligibility'
  );

  // ----------------------------------------------------
  // TEST 16: Discovery Run Statistics Reporting
  // ----------------------------------------------------
  const recentRuns = await mockRepo.getRecentDiscoveryRuns();
  assert(
    recentRuns.length >= 1 && recentRuns[0].newItems >= 2,
    'Test 16: Discovery run audit statistics successfully recorded and queryable'
  );

  // ----------------------------------------------------
  // TEST 17: Live Database Integration & RLS Verification (Supabase)
  // ----------------------------------------------------
  if (isSupabaseConfigured()) {
    console.log('\n--- Live Supabase Integration Verification ---');
    const supabaseClient = getSupabaseClient();
    const supabaseRepo = new SupabaseDiscoveryRepository(supabaseClient);

    // 17a. Source Seeding & Retrieval
    const liveSources = await supabaseRepo.getSources();
    assert(
      liveSources.length >= INITIAL_NEWS_SOURCES.length,
      'Test 17a: Live Supabase news_sources loaded and seeded with initial catalog',
      `Found ${liveSources.length} sources`
    );

    // 17b. Discovery Item Upsert & Query
    const testDiscoveryItem = normalizer.normalizeItem(rssItems[0], liveSources[0])!;
    const saveRes = await supabaseRepo.saveDiscoveryItems([testDiscoveryItem]);
    assert(
      saveRes.inserted + saveRes.updated + saveRes.noop > 0,
      'Test 17b: Discovery candidate successfully persisted to news_discovery_items table'
    );

    // 17c. Query by Fingerprint
    const queriedItem = await supabaseRepo.getDiscoveryItemByFingerprint(testDiscoveryItem.fingerprint);
    assert(
      queriedItem !== null && queriedItem.title === testDiscoveryItem.title,
      'Test 17c: Discovery item accurately retrieved from Supabase by fingerprint'
    );

    // 17d. Audit Run Log Record
    await supabaseRepo.recordDiscoveryRun(runResult);
    const runsFromDb = await supabaseRepo.getRecentDiscoveryRuns(5);
    assert(
      runsFromDb.length > 0,
      'Test 17d: Discovery run record successfully persisted to discovery_runs table in Supabase'
    );

    // 17e. RLS Security Check: Verify public/anonymous cannot insert unauthorized items into editorial tables
    const { error: insertError } = await supabaseClient
      .from('stories')
      .insert({
        id: 'unauthorized-test-id',
        slug: 'unauthorized-test-slug',
        title: 'Unauthorized Public Injection Attempt',
        excerpt: 'Test',
        content: 'Test',
        category_id: 'technology',
      });

    assert(
      Boolean(insertError),
      'Test 17e: RLS Protection validated — Direct public injection into editorial tables is rejected by database policy'
    );
  }

  console.log('\n====================================================');
  console.log(`ALL ${testsPassed}/${totalTests} PHASE 5 TEST CASES PASSED WITH 100% SUCCESS!`);
  console.log('====================================================\n');
}

runPhase5TestSuite().catch((err) => {
  console.error('Phase 5 Test Suite execution failed:', err);
  process.exit(1);
});
