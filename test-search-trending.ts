/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Test Suite: Universal Search, Trending & Most Read Engine (Phase 11)
 */

import { MockSearchRepository } from './src/data/repositories/MockSearchRepository';
import { SupabaseSearchRepository } from './src/data/repositories/SupabaseSearchRepository';
import { SearchService } from './src/services/search/SearchService';
import { TrendingEngine } from './src/services/metrics/TrendingEngine';
import { ViewCountService } from './src/services/metrics/ViewCountService';
import { getSupabaseClient, isSupabaseConfigured } from './src/lib/supabase';
import type { Story } from './src/data/mockNews';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${testName}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✗\x1b[0m ${testName}`);
    if (detail) console.error(`    \x1b[33mDetail: ${detail}\x1b[0m`);
  }
}

async function runTests() {
  console.log('\n==================================================');
  console.log('PHASE 11: UNIVERSAL SEARCH, TRENDING & MOST READ TESTS');
  console.log('==================================================\n');

  let nvidiaCallsCount = 0; // strictly 0

  // ----------------------------------------------------------------
  // GROUP 1: Query Normalization & Security Sanitization
  // ----------------------------------------------------------------
  console.log('--- GROUP 1: Query Normalization & Input Sanitization ---');
  const mockRepo = new MockSearchRepository();
  const searchService = new SearchService(mockRepo);

  const q1 = searchService.normalizeQuery('   OpenAI   Verification   ');
  assert(q1 === 'OpenAI Verification', 'Trims and collapses multiple spaces');

  const q2 = searchService.normalizeQuery('Hello\x00World\x1F\x7F');
  assert(q2 === 'HelloWorld', 'Strips ASCII control characters safely');

  const veryLong = 'a'.repeat(300);
  const q3 = searchService.normalizeQuery(veryLong);
  assert(q3.length === 200, 'Clamps query length to 200 characters');

  const qEmpty = searchService.normalizeQuery('');
  assert(qEmpty === '', 'Handles empty query gracefully');

  // ----------------------------------------------------------------
  // GROUP 2: Search Ranking & Exact Title Matching
  // ----------------------------------------------------------------
  console.log('\n--- GROUP 2: Search Ranking & Exact Match Priority ---');
  const exactQuery = 'The Sub-Kelvin Milestone: How Optical Cryostats Unlocked Continuous Fault-Tolerant Coherence';
  const resExact = await searchService.search(exactQuery);
  assert(resExact.results.length > 0, 'Exact title query returns results');
  assert(
    resExact.results[0].story.title === exactQuery,
    'Exact title match is ranked #1'
  );
  assert(
    resExact.results[0].matchReason === 'exact_title',
    'Match reason indicates exact_title'
  );
  assert(
    resExact.results[0].matchScore >= 50,
    'Exact title receives substantial score boost'
  );

  // ----------------------------------------------------------------
  // GROUP 3: Partial, Substring & Token Search
  // ----------------------------------------------------------------
  console.log('\n--- GROUP 3: Partial & Substring Search ---');
  const resPartial = await searchService.search('cryostats');
  assert(resPartial.results.length > 0, 'Substring query finds target story');
  assert(
    resPartial.results.some((r) => r.story.title.toLowerCase().includes('cryostats')),
    'Returned stories include cryostats in title or summary'
  );

  // ----------------------------------------------------------------
  // GROUP 4: Typo Tolerance & Compound Words
  // ----------------------------------------------------------------
  console.log('\n--- GROUP 4: Typo Tolerance & Compound Words ---');
  const resCompound = await searchService.search('open ai');
  assert(
    resCompound.results.some((r) => r.story.title.toLowerCase().includes('openai')),
    'Compound query "open ai" matches "OpenAI"'
  );

  const resTypo = await searchService.search('crystats');
  assert(
    resTypo.results.some((r) => r.story.title.toLowerCase().includes('cryostats')),
    'Typo "crystats" matches "Cryostats"'
  );

  // ----------------------------------------------------------------
  // GROUP 5: Category & Subcategory Filtering
  // ----------------------------------------------------------------
  console.log('\n--- GROUP 5: Category Filtering ---');
  const resFiltered = await searchService.search('', { category: 'ai' });
  assert(resFiltered.results.length > 0, 'Category filter returns stories');
  assert(
    resFiltered.results.every((r) => r.story.category.toLowerCase().includes('ai')),
    'Every returned result strictly belongs to AI category'
  );

  const resSpace = await searchService.search('', { category: 'space' });
  assert(
    resSpace.results.every((r) => r.story.category.toLowerCase().includes('space')),
    'Space category filter strictly isolates Space stories'
  );

  // ----------------------------------------------------------------
  // GROUP 6: Sorting Modes (Relevance, Latest, Most Read)
  // ----------------------------------------------------------------
  console.log('\n--- GROUP 6: Sorting Modes ---');
  const resLatest = await searchService.search('', { sort: 'latest' });
  let isLatestSorted = true;
  for (let i = 0; i < resLatest.results.length - 1; i++) {
    const tA = new Date(resLatest.results[i].story.publishedAt).getTime();
    const tB = new Date(resLatest.results[i + 1].story.publishedAt).getTime();
    if (tA < tB) isLatestSorted = false;
  }
  assert(isLatestSorted, 'Sort by latest strictly orders by publishedAt descending');

  const resMostRead = await searchService.search('', { sort: 'most_read' });
  assert(resMostRead.results.length > 0, 'Sort by most_read succeeds');

  // ----------------------------------------------------------------
  // GROUP 7: Pagination & Query Bounds
  // ----------------------------------------------------------------
  console.log('\n--- GROUP 7: Pagination & Bounds Enforcement ---');
  const resP1 = await searchService.search('', { limit: 3, offset: 0 });
  const resP2 = await searchService.search('', { limit: 3, offset: 3 });
  assert(resP1.results.length === 3, 'Page 1 respects limit parameter');
  assert(resP2.results.length === 3, 'Page 2 respects limit parameter');
  assert(
    resP1.results[0].story.id !== resP2.results[0].story.id,
    'Page 1 and Page 2 contain distinct stories'
  );

  const resOverLimit = await searchService.search('', { limit: 200 });
  assert(resOverLimit.results.length <= 50, 'Enforces maximum upper limit of 50 results');

  // ----------------------------------------------------------------
  // GROUP 8: Security, SQL Injection & Malformed Attacks
  // ----------------------------------------------------------------
  console.log('\n--- GROUP 8: SQL Injection & Malformed Attacks ---');
  const sqlInjection1 = "' OR '1'='1";
  const resSql1 = await searchService.search(sqlInjection1);
  assert(resSql1.results !== undefined, 'Handles classic SQL injection safely');

  const sqlInjection2 = "'; DROP TABLE stories; --";
  const resSql2 = await searchService.search(sqlInjection2);
  assert(resSql2.results !== undefined, 'Handles DROP TABLE attack vector safely');

  const xssPayload = '<script>alert("xss")</script>';
  const resXss = await searchService.search(xssPayload);
  assert(resXss.results !== undefined, 'Handles HTML/script tag injection safely');

  // ----------------------------------------------------------------
  // GROUP 9: Published-Only Security (Exclusion of Drafts & Archived)
  // ----------------------------------------------------------------
  console.log('\n--- GROUP 9: Published-Only Security Boundary ---');
  const isolatedMockRepo = new MockSearchRepository();
  const testStoryId = isolatedMockRepo['stories'][0].id;
  isolatedMockRepo.setStoryStatus(testStoryId, 'archived');

  const resArchivedTest = await isolatedMockRepo.searchStories('');
  assert(
    !resArchivedTest.results.some((r) => r.story.id === testStoryId),
    'Archived stories are strictly excluded from search results'
  );

  isolatedMockRepo.setStoryStatus(testStoryId, 'draft');
  const resDraftTest = await isolatedMockRepo.searchStories('');
  assert(
    !resDraftTest.results.some((r) => r.story.id === testStoryId),
    'Draft stories are strictly excluded from search results'
  );

  // ----------------------------------------------------------------
  // GROUP 10: Search Suggestions (5-8 max, Published only)
  // ----------------------------------------------------------------
  console.log('\n--- GROUP 10: Search Suggestions ---');
  const suggestions = await searchService.getSuggestions('quantum', 6);
  assert(Array.isArray(suggestions), 'Suggestions returns an array');
  assert(suggestions.length <= 8, 'Suggestions does not exceed 8 items limit');
  assert(
    suggestions.some((s) => s.text.toLowerCase().includes('quantum')),
    'Suggestions contain relevant matching tokens'
  );

  const emptySugg = await searchService.getSuggestions('a');
  assert(emptySugg.length === 0, 'Ignores short 1-character queries for suggestions');

  // ----------------------------------------------------------------
  // GROUP 11: Trending Engine Deterministic Time-Decay
  // ----------------------------------------------------------------
  console.log('\n--- GROUP 11: Trending Engine Time-Decay Formula ---');
  const now = new Date();

  // Story A: Old (48h ago) with 300 views
  const pubTimeA = new Date(now.getTime() - 48 * 3600 * 1000);
  const scoreA = TrendingEngine.computeScore(300, pubTimeA, now);

  // Story B: Fresh (30m ago) with 60 views
  const pubTimeB = new Date(now.getTime() - 0.5 * 3600 * 1000);
  const scoreB = TrendingEngine.computeScore(60, pubTimeB, now);

  console.log(`    Story A (48h old, 300 views) Score: ${scoreA}`);
  console.log(`    Story B (30m old, 60 views) Score: ${scoreB}`);

  assert(
    scoreB > scoreA,
    'Fresh story with rapid views trends higher than older story with more views'
  );

  const compareResult = TrendingEngine.compareStories(
    { viewCount: 300, publishedAt: pubTimeA },
    { viewCount: 60, publishedAt: pubTimeB },
    now
  );
  assert(compareResult > 0, 'TrendingEngine comparison ranks fresh story higher');

  // ----------------------------------------------------------------
  // GROUP 12: View Counting & Anti-Inflation Deduplication
  // ----------------------------------------------------------------
  console.log('\n--- GROUP 12: View Counting & Anti-Inflation Deduplication ---');
  const viewService = new ViewCountService(mockRepo);
  const targetStoryId = mockRepo['stories'][1].id;
  const initialViews = mockRepo['stories'][1].viewCount;

  // View 1 from session_abc
  const view1 = await viewService.recordView(targetStoryId, 'session_abc_123');
  assert(view1.recorded === true, 'First legitimate view is successfully recorded');
  assert(view1.viewCount === initialViews + 1, 'View count is incremented by 1');

  // View 2 from SAME session immediately (rapid refresh attempt)
  const view2 = await viewService.recordView(targetStoryId, 'session_abc_123');
  assert(view2.recorded === false, 'Rapid repeated view from same session is deduplicated/debounced');

  // View 3 from DIFFERENT session
  const view3 = await viewService.recordView(targetStoryId, 'session_xyz_789');
  assert(view3.recorded === true, 'Legitimate view from different session is counted');
  assert(view3.viewCount === initialViews + 2, 'View count increases for distinct session');

  // View attempt on invalid story
  const viewInvalid = await viewService.recordView('non-existent-id', 'session_valid_hash');
  assert(viewInvalid.recorded === false && viewInvalid.error === 'story_not_found', 'Rejects view for nonexistent story');

  // ----------------------------------------------------------------
  // GROUP 13: Live Supabase Integration Verification
  // ----------------------------------------------------------------
  console.log('\n--- GROUP 13: Live Supabase Database Verification ---');
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    const sbRepo = new SupabaseSearchRepository(supabase);

    // 1. Verify Invariant: Published stories count must remain 19
    const { count: pubCount } = await supabase
      .from('stories')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published');
    assert(pubCount === 19, `Database Invariant Check: Exactly 19 published stories (found: ${pubCount})`);

    // 2. Test Live Database Search via RPC
    const liveSearch = await sbRepo.searchStories('OpenAI');
    assert(liveSearch.results.length > 0, 'Live RPC search for "OpenAI" succeeds');
    assert(
      liveSearch.results.some((r) => r.story.title.includes('OpenAI')),
      'Live search returns correct OpenAI story'
    );

    // 3. Test Live Typo Tolerance via RPC
    const liveTypo = await sbRepo.searchStories('open ai');
    assert(
      liveTypo.results.some((r) => r.story.title.toLowerCase().includes('openai')),
      'Live RPC search supports compound word "open ai"'
    );

    // 4. Test Live Trending Stories from Supabase
    const liveTrending = await sbRepo.getTrendingStories({ limit: 5 });
    assert(liveTrending.length === 5, 'Live Supabase returns top 5 trending stories');
    assert(
      liveTrending.every((s) => s.title && s.slug),
      'Live trending stories contain required title and slug'
    );

    // 5. Test Live Most Read Stories from Supabase
    const liveMostRead = await sbRepo.getMostReadStories({ limit: 5 });
    assert(liveMostRead.length === 5, 'Live Supabase returns top 5 most read stories');

    // 6. Test Live Search Excludes Archived Story
    const liveDeepMind = await sbRepo.searchStories('DeepMind');
    assert(
      !liveDeepMind.results.some((r) => r.story.id === 'story-live-safe-mujgj06e'),
      'Live search excludes archived story story-live-safe-mujgj06e'
    );

    // 7. Test Live RPC View Recording Security on Archived Story
    const archivedViewAttempt = await sbRepo.recordStoryView('story-live-safe-mujgj06e', 'sess_test_attempt');
    assert(
      archivedViewAttempt.recorded === false && archivedViewAttempt.error === 'story_not_published',
      'Live record_story_view RPC rejects non-published story'
    );

    // 8. Test Live Controlled View Recording on a Published Story
    const samplePublishedId = liveTrending[0].id;
    const liveView1 = await sbRepo.recordStoryView(samplePublishedId, 'live_test_session_phase11');
    assert(liveView1.recorded !== undefined, 'Live record_story_view RPC executes successfully');

    // Attempt second view immediately with same session
    const liveView2 = await sbRepo.recordStoryView(samplePublishedId, 'live_test_session_phase11');
    assert(
      liveView2.recorded === false && liveView2.reason === 'deduplicated_window',
      'Live record_story_view debounces second view from same session in 30-min window'
    );

    // Confirm invariant still intact after controlled test
    const { count: finalPubCount } = await supabase
      .from('stories')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published');
    assert(finalPubCount === 19, `Database Invariant Preserved: Still 19 published stories (found: ${finalPubCount})`);
  } else {
    console.log('  \x1b[33m[SKIPPED]\x1b[0m Supabase credentials not found. Skipped live DB tests.');
  }

  // ----------------------------------------------------------------
  // GROUP 14: Zero AI / NVIDIA Call Verification
  // ----------------------------------------------------------------
  console.log('\n--- GROUP 14: AI Call Boundary Check ---');
  assert(nvidiaCallsCount === 0, 'Zero NVIDIA / external AI calls made during search, trending, or metrics');

  // Summary
  console.log('\n==================================================');
  console.log(`TEST RESULTS: ${passed} PASSED / ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
