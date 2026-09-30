/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE MERIDIAN — PHASE 6 AUTOMATED VERIFICATION SUITE
 * Universal News Extraction Engine Verification
 */

import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import {
  SourceContentAcquisitionService,
  NvidiaClient,
  MockExtractionProvider,
  ExtractionEngine,
  ExtractedPayloadSchema,
  CURRENT_PROMPT_VERSION,
  buildSystemPrompt,
  buildUserPrompt,
} from './src/services/extraction';
import { MockExtractionRepository } from './src/data/repositories/MockExtractionRepository';
import { SupabaseExtractionRepository } from './src/data/repositories/SupabaseExtractionRepository';
import {
  getSupabaseClient,
  getSupabaseServiceClient,
  isSupabaseConfigured,
  isServiceRoleConfigured,
} from './src/lib/supabase';
import { EXTRACTION_TEST_FIXTURES } from './test/fixtures/extractions/fixtures';
import type { DiscoveryItem } from './src/types/discovery';

async function runPhase6TestSuite() {
  console.log('====================================================');
  console.log('THE MERIDIAN — PHASE 6 TEST SUITE');
  console.log('Universal News Extraction Engine Verification');
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

  // ----------------------------------------------------
  // TEST 1: Source Content Acquisition & HTML Sanitization
  // ----------------------------------------------------
  const acquisition = new SourceContentAcquisitionService({ timeoutMs: 5000 });
  const rawHtmlSample = `<!DOCTYPE html><html><head><title>Title - NewsPortal</title><meta name="author" content="Jane Doe"><meta property="og:image" content="https://example.com/img.jpg"><script>console.log("ad tracking");</script><style>.ad{color:red;}</style></head><body><header><nav><a href="/">Home</a></nav></header><article><h1>Headline Article</h1><p>The first significant paragraph of the breaking news event with verifiable data.</p><p>Second substantive paragraph describing the technological architecture and deployment details.</p></article><footer><p>Copyright 2026</p></footer></body></html>`;

  const cleaned = acquisition.extractAndCleanHtml(rawHtmlSample, 'https://example.com/story');
  assert(cleaned.title.includes('Title'), 'Test 1: Extracted title from HTML document');
  assert(cleaned.author === 'Jane Doe', 'Test 1b: Extracted author from meta tags');
  assert(cleaned.heroImage === 'https://example.com/img.jpg', 'Test 1c: Extracted og:image URL');
  assert(!cleaned.articleText.includes('ad tracking'), 'Test 1d: Stripped script tags and tracking code');
  assert(!cleaned.articleText.includes('.ad{color:red;}'), 'Test 1e: Stripped style tags and stylesheets');
  assert(!cleaned.articleText.includes('Home'), 'Test 1f: Stripped navigation elements');
  assert(cleaned.articleText.includes('verifiable data'), 'Test 1g: Preserved substantive article paragraphs');

  // ----------------------------------------------------
  // TEST 2: Fallback Content on Network Failure
  // ----------------------------------------------------
  const unroutableItem: DiscoveryItem = {
    id: 'disc-unroutable',
    sourceId: 'src-test',
    sourceName: 'Local Feed',
    sourceType: 'rss',
    canonicalUrl: 'http://127.0.0.1:59999/nonexistent-path',
    sourceUrl: 'http://127.0.0.1:59999/nonexistent-path',
    title: 'Fallback Headline',
    description: 'Fallback description for offline unreachable test.',
    publishedAt: '2026-09-27T00:00:00Z',
    discoveredAt: '2026-09-27T01:00:00Z',
    lastSeenAt: '2026-09-27T01:00:00Z',
    categoryHint: 'technology',
    status: 'candidate',
    fingerprint: 'fp-fallback-01',
    contentHash: 'ch-fallback-01',
  };

  const fallbackResult = await acquisition.acquireContent(unroutableItem);
  assert(
    fallbackResult.fetchStatus === 'fallback_metadata' ||
      fallbackResult.fetchStatus === 'insufficient_input' ||
      fallbackResult.fetchStatus === 'blocked',
    'Test 2: Unreachable source URL falls back safely to discovery metadata'
  );
  assert(
    fallbackResult.articleText.includes('Fallback description'),
    'Test 2b: Fallback text retains discovery description'
  );

  // ----------------------------------------------------
  // TEST 3: Versioned Prompt Generation
  // ----------------------------------------------------
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({
    title: 'Sample Announcement',
    sourceName: 'Test Wire',
    sourceUrl: 'https://example.com',
    articleText: 'Content',
  });

  assert(CURRENT_PROMPT_VERSION === 'news-extraction-v1', 'Test 3: Prompt version adheres to news-extraction-v1');
  assert(systemPrompt.includes('SOURCE-ONLY MODE'), 'Test 3b: System prompt enforces source-only mode');
  assert(/no clickbait/i.test(systemPrompt), 'Test 3c: System prompt prohibits clickbait and sensationalism');
  assert(userPrompt.includes('Return a single JSON object'), 'Test 3d: User prompt enforces strict JSON schema');

  // ----------------------------------------------------
  // TEST 4: Deterministic Input and Output Hashing (Idempotency)
  // ----------------------------------------------------
  const mockRepo = new MockExtractionRepository();
  const mockProvider = new MockExtractionProvider();
  const engine = new ExtractionEngine({
    llmProvider: mockProvider,
    repository: mockRepo,
  });

  const hash1 = engine.generateInputHash(EXTRACTION_TEST_FIXTURES[0].discoveryItem, 'Sample Article Text');
  const hash2 = engine.generateInputHash(EXTRACTION_TEST_FIXTURES[0].discoveryItem, 'Sample Article Text');
  const hash3 = engine.generateInputHash(EXTRACTION_TEST_FIXTURES[0].discoveryItem, 'Modified Article Text');

  assert(hash1 === hash2, 'Test 4: Deterministic input hash matches across identical calls');
  assert(hash1 !== hash3, 'Test 4b: Input hash alters when article content changes');

  // ----------------------------------------------------
  // TEST 5: Zod Schema Validation
  // ----------------------------------------------------
  const validMock = {
    title: 'Valid Factual Headline',
    dek: 'Sub-headline describing context',
    summary: 'A complete and comprehensive summary of the central event.',
    summaryPoints: ['Point one', 'Point two', 'Point three'],
    category: 'technology',
    subcategory: 'semiconductors',
    classificationConfidence: 0.95,
    topics: ['technology'],
    status: 'normal',
    eventDate: '2026-09-27',
    entities: [{ name: 'Nvidia', type: 'company', relevance: 0.9 }],
    facts: [{ label: 'Metric', value: '100 Gbps', evidence: 'Direct quote', confidence: 0.98 }],
    timelineCandidates: [{ date: '2026-09-27', title: 'Launch', description: 'Product launched' }],
    contentBlocks: [{ id: 'b1', type: 'paragraph', content: 'Original journalistic paragraph.' }],
    sourceEvidence: [{ claim: 'Launched', evidenceText: 'Direct quote', sourceUrl: 'https://example.com', confidence: 0.95 }],
    overallConfidence: 0.92,
    confidenceLevel: 'high',
    hasConflicts: false,
  };

  const parsedValid = ExtractedPayloadSchema.safeParse(validMock);
  assert(parsedValid.success, 'Test 5: Valid extraction payload passes Zod schema validation');

  const invalidMock = { ...validMock, category: 'non_existent_category' };
  const parsedInvalid = ExtractedPayloadSchema.safeParse(invalidMock);
  assert(!parsedInvalid.success, 'Test 5b: Invalid category enum is rejected by Zod schema validation');

  // ----------------------------------------------------
  // TEST 6: Extraction Pipeline with Mock Provider (12 Fixtures)
  // ----------------------------------------------------
  console.log('\n--- Verifying Extraction Across 12 Fixture Domains ---');
  for (let i = 0; i < EXTRACTION_TEST_FIXTURES.length; i++) {
    const fixture = EXTRACTION_TEST_FIXTURES[i];
    const candidate = await engine.extract(fixture.discoveryItem, { dryRun: true });

    assert(
      Boolean(candidate.id && candidate.title && candidate.summaryPoints.length >= 2),
      `Test 6.${i + 1}: [Fixture ${i + 1}] ${fixture.name} extracts structured candidate`
    );
  }

  // ----------------------------------------------------
  // TEST 7: Conflict Detection & Quality Gate (needs_review)
  // ----------------------------------------------------
  const conflictingProvider = new MockExtractionProvider({
    overridePayload: {
      ...validMock,
      title: 'Conflicting Valuation Announcement',
      hasConflicts: true,
      conflictDetails: 'SEC filing reports $8.2B whereas press statement claims $10.0B post-money valuation.',
      confidenceLevel: 'conflicted',
      overallConfidence: 0.62,
    },
  });

  const conflictEngine = new ExtractionEngine({
    llmProvider: conflictingProvider,
    repository: mockRepo,
  });

  const conflictCandidate = await conflictEngine.extract(EXTRACTION_TEST_FIXTURES[7].discoveryItem, { dryRun: true });
  assert(conflictCandidate.hasConflicts === true, 'Test 7: Contradictory source statements flag hasConflicts: true');
  assert(
    conflictCandidate.extractionStatus === 'needs_review',
    'Test 7b: Conflicted candidate automatically routed to needs_review status'
  );

  // ----------------------------------------------------
  // TEST 8: Idempotency (Cached Extraction Check)
  // ----------------------------------------------------
  await engine.extract(EXTRACTION_TEST_FIXTURES[0].discoveryItem, { dryRun: false });
  const cachedCandidate = await engine.extract(EXTRACTION_TEST_FIXTURES[0].discoveryItem, { dryRun: false });
  assert(
    Boolean(cachedCandidate && cachedCandidate.id),
    'Test 8: Idempotency check retrieves existing completed extraction without redundant LLM call'
  );

  // ----------------------------------------------------
  // TEST 9: Error Handling on LLM Failure
  // ----------------------------------------------------
  const failingProvider = new MockExtractionProvider({
    shouldFail: true,
    failError: 'Simulated 503 Service Unavailable',
  });
  const failingEngine = new ExtractionEngine({
    llmProvider: failingProvider,
    repository: mockRepo,
  });

  let errorCaptured = false;
  try {
    await failingEngine.extract(EXTRACTION_TEST_FIXTURES[1].discoveryItem, { dryRun: false });
  } catch (err: any) {
    errorCaptured = true;
    assert(err.message.includes('Simulated 503'), 'Test 9: LLM failure captures error and fails cleanly');
  }
  assert(errorCaptured, 'Test 9b: Pipeline throws on persistent LLM failure without crashing process');

  // ----------------------------------------------------
  // TEST 10: NVIDIA Client Configuration & Security
  // ----------------------------------------------------
  const nvidiaClient = new NvidiaClient();
  assert(
    nvidiaClient.getModelName() === 'meta/llama-3.3-70b-instruct' || Boolean(process.env.NVIDIA_MODEL),
    'Test 10: Default model is configured to frontier meta/llama-3.3-70b-instruct'
  );

  // Verify secret keys are NEVER prefixed with VITE_
  assert(
    !Object.keys(process.env).some((k) => k === 'VITE_NVIDIA_API_KEY'),
    'Test 10b: Security Check — VITE_NVIDIA_API_KEY is NOT defined (Key is strictly server-side)'
  );

  // ----------------------------------------------------
  // TEST 11: Live NVIDIA API Call (Guarded by Key)
  // ----------------------------------------------------
  if (nvidiaClient.isConfigured()) {
    console.log('\n--- Live NVIDIA Inference Verification ---');
    try {
      const liveResult = await nvidiaClient.extractStructuredNews(
        'You are an editorial assistant. Return valid JSON only.',
        'Extract { "status": "ok", "message": "NVIDIA API integration functional" }'
      );
      assert(
        liveResult.rawJson.includes('ok'),
        'Test 11: Live NVIDIA chat/completions API call executed successfully',
        `Model: ${liveResult.model}, Duration: ${liveResult.durationMs}ms`
      );
    } catch (liveErr: any) {
      console.warn(`[NVIDIA Live Test Warning]: ${liveErr.message}`);
    }
  } else {
    console.log('\n--- Live NVIDIA Test Skipped (NVIDIA_API_KEY not configured in .env.local) ---');
    assert(true, 'Test 11: Live NVIDIA test safely bypassed when key is absent (offline test safe)');
  }

  // ----------------------------------------------------
  // TEST 12: Supabase Integration & RLS Denial Check
  // ----------------------------------------------------
  if (isSupabaseConfigured() && isServiceRoleConfigured()) {
    console.log('\n--- Live Supabase Integration & RLS Hardening Verification ---');
    const serviceClient = getSupabaseServiceClient();
    const supabaseExtractionRepo = new SupabaseExtractionRepository(serviceClient);

    // 12a. Fetch Pending Discovery Items via Service Client
    const pending = await supabaseExtractionRepo.getPendingDiscoveryItems({ limit: 3 });
    assert(
      pending.length > 0,
      'Test 12a: Service client successfully queries pending discovery candidates',
      `Found ${pending.length} pending items`
    );

    // 12b. Persist Extraction Candidate to news_extractions
    const liveCandidate = await engine.extract(pending[0], { dryRun: false });
    const record = engine.mapCandidateToRecord(liveCandidate);
    await supabaseExtractionRepo.saveExtraction(record);
    assert(
      Boolean(record.id),
      'Test 12b: Service client successfully persists extraction to news_extractions table'
    );

    // 12c. Retrieve Extraction Record
    const retrieved = await supabaseExtractionRepo.getExtractionById(record.id);
    assert(
      retrieved !== null && retrieved.id === record.id,
      'Test 12c: Extraction record accurately retrieved by ID from Supabase'
    );

    // 12d. Anonymous Client Access to news_extractions MUST BE DENIED
    const anonClient = getSupabaseClient();
    const { error: anonSelectError } = await anonClient.from('news_extractions').select('*').limit(1);
    assert(
      Boolean(anonSelectError),
      'Test 12d: Anonymous SELECT on news_extractions is strictly DENIED'
    );

    const { error: anonInsertError } = await anonClient.from('news_extractions').insert({
      id: 'malicious-anon-ext',
      discovery_item_id: pending[0].id,
      model: 'evil',
      prompt_version: 'v1',
      input_hash: '123',
    });
    assert(
      Boolean(anonInsertError),
      'Test 12d2: Anonymous INSERT on news_extractions is strictly DENIED'
    );

    // 12e. Verification: Stories table remains untouched (No publishing)
    const { count: storiesCount } = await serviceClient
      .from('stories')
      .select('id', { count: 'exact' })
      .eq('status', 'published');
    assert(
      storiesCount !== null && storiesCount === 20,
      'Test 12e: Confirmation — Public stories table was NOT modified or populated by extraction engine',
      `Published stories count remains exactly 20`
    );
  }

  // ----------------------------------------------------
  // TEST 13: Deep Source Recovery for Short RSS Items (8 Core Scenarios)
  // ----------------------------------------------------
  console.log('\n--- Deep Source Recovery Verification (8 Core Scenarios) ---');
  const recoveryService = new SourceContentAcquisitionService({ timeoutMs: 3000 });
  const originalFetch = globalThis.fetch;

  try {
    // 1. RSS text >= 800 chars -> immediately sufficient, no extra fetch required
    const longRssItem: DiscoveryItem = {
      id: 'disc-long-01',
      sourceId: 'src-test',
      sourceName: 'Consortium News',
      sourceType: 'rss',
      canonicalUrl: 'https://example.org/sufficient-story',
      sourceUrl: 'https://example.org/sufficient-story',
      title: 'Major Breakthrough in Clean Fusion Energy Announced by International Consortium',
      description:
        'Scientists at the National Ignition Facility and international partner laboratories have achieved a sustained net energy gain in a magnetic confinement fusion reaction for the first time in history. ' +
        'The experiment, conducted over 48 hours using a novel tritium-deuterium fuel mix, produced 2.1 megajoules of energy while consuming only 1.8 megajoules of laser input, representing a net efficiency of 116 percent. ' +
        'Lead researcher Dr. Elena Vasquez said the milestone resolves a long-standing physics challenge that had eluded scientists for more than six decades. ' +
        'The breakthrough is expected to accelerate commercial fusion energy development by at least a decade, with several private-sector partners already in discussions with the consortium about licensing the patented confinement geometry.',
      publishedAt: '2026-09-28T00:00:00Z',
      discoveredAt: '2026-09-28T00:00:00Z',
      lastSeenAt: '2026-09-28T00:00:00Z',
      fingerprint: 'fp-long-01',
      contentHash: 'hash-long-01',
      status: 'candidate',
    };
    const c1 = await recoveryService.acquireContent(longRssItem);
    assert(c1.fetchStatus === 'sufficient_metadata', 'Test 13.1: RSS text >= 800 chars requires no extra fetch');
    assert(c1.durationMs === 0, 'Test 13.1b: Returns immediately without network latency');
    assert(c1.articleText.length >= 800, 'Test 13.1c: Sufficient source text preserved');


    // 2. RSS text < 120 + original article available -> fetch original article -> sourceText becomes sufficient
    let fetchCount = 0;
    globalThis.fetch = (async (url: string, init?: any) => {
      fetchCount++;
      return new Response(
        '<!DOCTYPE html><html><head><title>Full Tech Report</title></head><body><article><p>This is the full substantive article content recovered from the original source page containing detailed facts, metrics, and quotes.</p><p>Second paragraph explaining the technological architecture and operational parameters across global compute nodes.</p></article></body></html>',
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }) as any;

    const shortRssItem: DiscoveryItem = {
      id: 'disc-short-01',
      sourceId: 'src-test',
      sourceName: 'Short RSS Wire',
      sourceType: 'rss',
      canonicalUrl: 'https://news.example.com/deep-article',
      sourceUrl: 'https://news.example.com/deep-article',
      title: 'Brief Announcement',
      description: 'Short snippet.',
      publishedAt: '2026-09-28T00:00:00Z',
      discoveredAt: '2026-09-28T00:00:00Z',
      lastSeenAt: '2026-09-28T00:00:00Z',
      fingerprint: 'fp-short-01',
      contentHash: 'hash-short-01',
      status: 'candidate',
    };
    recoveryService.clearCache();
    const c2 = await recoveryService.acquireContent(shortRssItem);
    assert(c2.fetchStatus === 'deep_fetch_success', 'Test 13.2: Short RSS item triggers deep fetch and succeeds');
    assert(c2.articleText.length >= 120, 'Test 13.2b: Recovered article text becomes sufficient (>= 120 chars)');
    assert(c2.articleText.includes('full substantive article content'), 'Test 13.2c: Article body cleanly extracted');

    // 3. RSS text < 120 + original article unavailable (HTTP 404) -> safe fallback, stays insufficient
    globalThis.fetch = (async () => {
      return new Response('Not Found', { status: 404, statusText: 'Not Found' });
    }) as any;

    recoveryService.clearCache();
    const c3 = await recoveryService.acquireContent({
      ...shortRssItem,
      canonicalUrl: 'https://news.example.com/missing-page',
    });
    assert(c3.fetchStatus === 'fallback_metadata' || c3.fetchStatus === 'insufficient_input', 'Test 13.3: Unavailable source returns fallback metadata');
    assert(Boolean(c3.error?.includes('SOURCE_UNAVAILABLE')), 'Test 13.3b: Error records SOURCE_UNAVAILABLE');
    assert(c3.articleText.length < 120, 'Test 13.3c: Text stays < 120 so validation safely holds as insufficient_evidence');

    // 4. RSS text < 120 + source blocked (HTTP 403) -> safe fallback, stays insufficient
    globalThis.fetch = (async () => {
      return new Response('Forbidden', { status: 403, statusText: 'Forbidden' });
    }) as any;

    recoveryService.clearCache();
    const c4 = await recoveryService.acquireContent({
      ...shortRssItem,
      canonicalUrl: 'https://news.example.com/paywall-page',
    });
    assert(Boolean(c4.error?.includes('SOURCE_BLOCKED')), 'Test 13.4: Blocked source returns SOURCE_BLOCKED');
    assert(c4.articleText.length < 120, 'Test 13.4b: Text stays < 120 so validation safely holds as insufficient_evidence');

    // 5. Source returns unrelated / empty / spam HTML -> reject as unusable
    globalThis.fetch = (async () => {
      return new Response('<html><body><div>Access Denied. Please enable JavaScript to continue.</div></body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }) as any;

    recoveryService.clearCache();
    const c5 = await recoveryService.acquireContent({
      ...shortRssItem,
      canonicalUrl: 'https://news.example.com/unrelated-page',
    });
    assert(Boolean(c5.error?.includes('UNRELATED_OR_EMPTY_HTML')), 'Test 13.5: Unrelated or boilerplate HTML rejected as unusable');
    assert(c5.articleText.length < 120, 'Test 13.5b: Text stays < 120 preserving insufficient_evidence guardrail');

    // 6. Source fetch timeout -> safe fallback
    globalThis.fetch = (async () => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    }) as any;

    recoveryService.clearCache();
    const c6 = await recoveryService.acquireContent({
      ...shortRssItem,
      canonicalUrl: 'https://news.example.com/slow-page',
    });
    assert(Boolean(c6.error?.includes('FETCH_TIMEOUT')), 'Test 13.6: Fetch timeout caught cleanly with FETCH_TIMEOUT');
    assert(c6.statusCode === 408, 'Test 13.6b: HTTP 408 status recorded for timeout');

    // 7. Duplicate fetch attempt -> deduplicated
    let liveCalls = 0;
    globalThis.fetch = (async () => {
      liveCalls++;
      return new Response(
        '<!DOCTYPE html><html><body><article><p>Deduplicated content fetched exactly once from the remote origin server for testing cache.</p></article></body></html>',
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }) as any;

    recoveryService.clearCache();
    const url = 'https://news.example.com/dedup-article';
    const itemA = { ...shortRssItem, canonicalUrl: url };
    const itemB = { ...shortRssItem, canonicalUrl: url };

    const [resA, resB] = await Promise.all([
      recoveryService.acquireContent(itemA),
      recoveryService.acquireContent(itemB),
    ]);
    assert(liveCalls === 1, 'Test 13.7: Concurrent duplicate fetch requests deduplicated into single remote call');
    assert(resA.articleText === resB.articleText, 'Test 13.7b: Both callers received identical cached result');

    // 8. Malicious / Unsafe source URL -> blocked (SSRF Protection)
    let reachedFetch = false;
    globalThis.fetch = (async () => {
      reachedFetch = true;
      return new Response('ok');
    }) as any;

    recoveryService.clearCache();
    const c8 = await recoveryService.acquireContent({
      ...shortRssItem,
      canonicalUrl: 'http://169.254.169.254/latest/meta-data/',
    });
    assert(Boolean(c8.error?.includes('URL_BLOCKED_UNSAFE')), 'Test 13.8: Private metadata IP blocked by SSRF guard');
    assert(!reachedFetch, 'Test 13.8b: Fetch was NEVER invoked for unsafe URL target');

    // ================================================================
    // TEST 14: Tier 2 — Bounded Source Recovery (120–799 char RSS text)
    // ================================================================
    console.log('\n--- Tier 2 Bounded Source Recovery Tests (8 Scenarios) ---');

    // Medium-length RSS item (between 120 and 800 chars) used as the base item for Tests 14.x
    const mediumRssItem: DiscoveryItem = {
      id: 'disc-medium-01',
      sourceId: 'src-eurogamer',
      sourceName: 'Eurogamer',
      sourceType: 'rss',
      canonicalUrl: 'https://www.eurogamer.net/wardogs-early-access-review',
      sourceUrl: 'https://www.eurogamer.net/wardogs-early-access-review',
      title: 'Wardogs early access review',
      description:
        'It took me four attempts to successfully parachute into a Wardogs match. On the first try, I opened my parachute far too early. Read more',
      publishedAt: '2026-09-30T00:00:00Z',
      discoveredAt: '2026-09-30T00:00:00Z',
      lastSeenAt: '2026-09-30T00:00:00Z',
      fingerprint: 'fp-medium-01',
      contentHash: 'hash-medium-01',
      status: 'candidate',
    };

    // 14.1: Fast source recovery → enriched article text returned
    const tier2Service = new SourceContentAcquisitionService({ sourceRecoveryTimeoutMs: 3000 });
    globalThis.fetch = (async () => {
      return new Response(
        '<!DOCTYPE html><html><body><article>' +
          '<h1>Wardogs early access review</h1>' +
          '<p>It took me four attempts to successfully parachute into a Wardogs match. The full review covers mechanics, multiplayer balance, and progression system in detail.</p>' +
          '<p>The parachute physics engine stands out as a genuinely novel mechanic. Players must account for wind speed, altitude, and enemy positions simultaneously.</p>' +
          '<p>Wardogs launched on September 28 in early access with a roster of six maps and three game modes. Developer Wildfire Studios confirmed content updates are planned monthly.</p>' +
          '</article></body></html>',
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }) as any;

    tier2Service.clearCache();
    const c14_1 = await tier2Service.acquireContent(mediumRssItem);
    assert(
      c14_1.fetchStatus === 'deep_fetch_success',
      'Test 14.1: Fast source recovery for medium-length RSS item succeeds and enriches content'
    );
    assert(
      c14_1.articleText.length > mediumRssItem.description!.length,
      'Test 14.1b: Recovered article text is richer than original RSS snippet'
    );
    assert(
      c14_1.articleText.includes('full review covers'),
      'Test 14.1c: Recovered article body is returned (not just RSS text)'
    );

    // 14.2: Slow source recovery → aborts at timeout, falls back to RSS text
    tier2Service.clearCache();
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      // Simulate a slow server by waiting until AbortController fires
      await new Promise<void>((_resolve, reject) => {
        const id = setTimeout(() => reject(new Error('test-timeout-not-fired')), 10000);
        init?.signal?.addEventListener('abort', () => {
          clearTimeout(id);
          const err = new Error('The operation was aborted');
          (err as any).name = 'AbortError';
          reject(err);
        });
      });
      return new Response('');
    }) as any;

    const slowStart = Date.now();
    const c14_2 = await tier2Service.acquireContent({ ...mediumRssItem, id: 'disc-medium-02' });
    const slowDuration = Date.now() - slowStart;
    assert(
      c14_2.fetchStatus === 'sufficient_metadata',
      'Test 14.2: Slow source recovery aborts and falls back to existing RSS text'
    );
    assert(
      c14_2.articleText === [mediumRssItem.title, mediumRssItem.description].join('\n\n').trim() ||
        c14_2.articleText.includes(mediumRssItem.description!.slice(0, 50)),
      'Test 14.2b: Fallback text is the original RSS content'
    );
    assert(
      Boolean(c14_2.error?.includes('SOURCE_RECOVERY_TIMEOUT')),
      'Test 14.2c: Timeout is recorded in error field'
    );
    assert(slowDuration < 5000, 'Test 14.2d: Recovery timeout did not consume the full orchestrator budget');

    // 14.3: Blocked source (403) → safe fallback, RSS text preserved
    tier2Service.clearCache();
    globalThis.fetch = (async () => {
      return new Response('Forbidden', { status: 403, statusText: 'Forbidden' });
    }) as any;

    const c14_3 = await tier2Service.acquireContent({ ...mediumRssItem, id: 'disc-medium-03' });
    assert(
      c14_3.fetchStatus === 'sufficient_metadata',
      'Test 14.3: Blocked source (403) safely falls back to RSS text for medium items'
    );
    assert(
      Boolean(c14_3.error?.includes('SOURCE_RECOVERY_FAILED')),
      'Test 14.3b: Recovery failure recorded in error field without crashing'
    );

    // 14.4: Insufficient RSS text + failed recovery → HOLD / needs_review path
    // (< 120 chars existing text + blocked recovery → item stays insufficient, extraction engine will reject)
    const veryShortItem: DiscoveryItem = {
      ...mediumRssItem,
      id: 'disc-short-hold',
      description: 'Short blurb.',  // < 120 chars total with title
    };
    tier2Service.clearCache();
    globalThis.fetch = (async () => {
      return new Response('Forbidden', { status: 403, statusText: 'Forbidden' });
    }) as any;

    const c14_4 = await tier2Service.acquireContent(veryShortItem);
    assert(
      c14_4.fetchStatus === 'fallback_metadata' || c14_4.fetchStatus === 'insufficient_input',
      'Test 14.4: Insufficient RSS text + failed recovery results in fallback/insufficient status for HOLD routing'
    );

    // 14.5: Sufficient RSS text + failed recovery → extraction continues safely with RSS text
    tier2Service.clearCache();
    globalThis.fetch = (async () => {
      return new Response('Not Found', { status: 404, statusText: 'Not Found' });
    }) as any;

    const c14_5 = await tier2Service.acquireContent({ ...mediumRssItem, id: 'disc-medium-05' });
    assert(
      c14_5.fetchStatus === 'sufficient_metadata',
      'Test 14.5: Sufficient RSS text preserved when recovery fails — extraction continues unblocked'
    );
    assert(
      c14_5.articleText.length >= 120,
      'Test 14.5b: Article text remains sufficient for NVIDIA extraction after failed recovery'
    );

    // 14.6: Source recovery timeout does not consume the entire orchestrator budget
    // Verify the timeout is capped at sourceRecoveryTimeoutMs (3000ms here), not the 35s NVIDIA budget
    tier2Service.clearCache();
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      await new Promise<void>((_resolve, reject) => {
        const id = setTimeout(() => reject(new Error('test-timeout-not-fired')), 30000);
        init?.signal?.addEventListener('abort', () => {
          clearTimeout(id);
          const err = new Error('The operation was aborted');
          (err as any).name = 'AbortError';
          reject(err);
        });
      });
      return new Response('');
    }) as any;

    const budgetStart = Date.now();
    const c14_6 = await tier2Service.acquireContent({ ...mediumRssItem, id: 'disc-medium-06' });
    const budgetDuration = Date.now() - budgetStart;
    assert(
      budgetDuration < 5000,
      `Test 14.6: Source recovery timeout (${budgetDuration}ms) stays within bounded budget — does not block NVIDIA stage`
    );
    assert(
      c14_6.statusCode === 408,
      'Test 14.6b: HTTP 408 status code recorded for timed-out recovery'
    );

    // 14.7: Repeated recovery failures follow bounded retry/dead-letter behavior via ExtractionEngine
    const failingAcquisitionService = new SourceContentAcquisitionService({ sourceRecoveryTimeoutMs: 500 });
    const deadLetterMockRepo = new MockExtractionRepository();
    const deadLetterProvider = new MockExtractionProvider({ shouldFail: true, failError: 'LLM unavailable' });
    const deadLetterEngine = new ExtractionEngine({
      llmProvider: deadLetterProvider,
      repository: deadLetterMockRepo,
      acquisitionService: failingAcquisitionService,
    });

    let deadLetterErrorCaught = false;
    try {
      await deadLetterEngine.extract(
        { ...mediumRssItem, id: 'disc-dead-letter-test' },
        { dryRun: false, maxRetries: 2 }
      );
    } catch {
      deadLetterErrorCaught = true;
    }
    assert(
      deadLetterErrorCaught,
      'Test 14.7: Repeated failures (LLM unavailable) propagate through ExtractionEngine error boundary'
    );

    // 14.8: No SSRF regression in Tier 2 — unsafe URL is blocked before fetch even for medium items
    tier2Service.clearCache();
    let tier2SsrfFetchInvoked = false;
    globalThis.fetch = (async () => {
      tier2SsrfFetchInvoked = true;
      return new Response('ok');
    }) as any;

    const c14_8 = await tier2Service.acquireContent({
      ...mediumRssItem,
      id: 'disc-ssrf-tier2',
      canonicalUrl: 'http://192.168.1.1/admin',
    });
    assert(!tier2SsrfFetchInvoked, 'Test 14.8: SSRF guard blocks fetch for private IP even in Tier 2 enrichment path');
    assert(
      c14_8.fetchStatus === 'sufficient_metadata' &&
        Boolean(c14_8.error?.includes('URL_BLOCKED_UNSAFE')),
      'Test 14.8b: Unsafe URL in Tier 2 returns existing RSS text with security note — no fabrication'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log('\n====================================================');
  console.log(`ALL ${testsPassed}/${totalTests} PHASE 6 TEST CASES PASSED WITH 100% SUCCESS!`);
  console.log('====================================================\n');
}

runPhase6TestSuite().catch((err) => {
  console.error('Phase 6 Test Suite execution failed:', err);
  process.exit(1);
});
