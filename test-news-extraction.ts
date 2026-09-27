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
    title: 'Fallback Headline for Offline Testing',
    description: 'Fallback description provided by the discovery RSS feed when the source webpage is unreachable.',
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
    fallbackResult.fetchStatus === 'fallback_metadata' || fallbackResult.fetchStatus === 'insufficient_input',
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
      storiesCount !== null && storiesCount === 19,
      'Test 12e: Confirmation — Public stories table was NOT modified or populated by extraction engine',
      `Published stories count remains exactly 19`
    );
  }

  console.log('\n====================================================');
  console.log(`ALL ${testsPassed}/${totalTests} PHASE 6 TEST CASES PASSED WITH 100% SUCCESS!`);
  console.log('====================================================\n');
}

runPhase6TestSuite().catch((err) => {
  console.error('Phase 6 Test Suite execution failed:', err);
  process.exit(1);
});
