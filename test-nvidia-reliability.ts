/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE MERIDIAN — NVIDIA EXTRACTION RELIABILITY TEST SUITE
 * Verifies all 7 extraction reliability requirements:
 * 1. Normal successful extraction
 * 2. Clean timeout enforcement (aborts cleanly without hanging or retrying)
 * 3. API failure handling (5xx server error, 4xx client error)
 * 4. Large source input handling (multi-paragraph source text without crashing)
 * 5. Large structured response validation (full payload with facts, entities, content blocks)
 * 6. Bounded retry behavior (retries transient 5xx once, does NOT retry timeouts or 4xx)
 * 7. Dead-letter behavior (DEAD_LETTER_MAX_RETRIES assigned after max attempts)
 */

import http from 'http';
import assert from 'assert';
import { NvidiaClient } from './src/services/extraction/NvidiaClient';
import { ExtractionEngine } from './src/services/extraction/ExtractionEngine';
import { MockExtractionRepository } from './src/data/repositories/MockExtractionRepository';
import { ExtractedPayloadSchema } from './src/services/extraction/ExtractionSchema';
import {
  buildSystemPrompt,
  buildUserPrompt,
  type PromptInput,
} from './src/services/extraction/extractionPrompt';
import type { DiscoveryItem } from './src/types/discovery';

async function runReliabilityTestSuite() {
  console.log('====================================================');
  console.log('THE MERIDIAN — NVIDIA EXTRACTION RELIABILITY TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function testAssert(cond: boolean, name: string, details?: string) {
    total++;
    if (!cond) {
      console.error(`❌ [FAIL] ${name}${details ? ` - ${details}` : ''}`);
      throw new Error(`Test failed: ${name}`);
    }
    console.log(`✅ [PASS] ${name}${details ? ` (${details})` : ''}`);
    passed++;
  }

  // Sample valid structured response
  const validExtractionPayload = {
    title: 'European Space Agency Approves Major Climate Mission',
    dek: 'Constellation of four satellites will track carbon emissions and sea levels from 2028.',
    summary:
      'The European Space Agency Council has committed €1.8 billion to develop Project Aeolus-2, a satellite constellation designed to monitor greenhouse gas concentrations and sea-level rise.',
    summaryPoints: [
      'Unanimous ministerial approval committed €1.8B over five years.',
      'Four low-Earth orbit satellites equipped with advanced lidar sensors.',
      'Initial launch scheduled for late 2028 from Europe Spaceport in Kourou.',
    ],
    category: 'space',
    subcategory: 'climate-satellites',
    classificationConfidence: 0.98,
    topics: ['esa', 'space', 'climate', 'satellites'],
    status: 'normal',
    eventDate: '2026-09-30',
    author: null,
    entities: [
      { name: 'European Space Agency', type: 'organization', relevance: 0.95 },
      { name: 'Airbus Defence and Space', type: 'company', relevance: 0.85 },
      { name: 'Josef Aschbacher', type: 'person', relevance: 0.8 },
    ],
    facts: [
      {
        label: 'Mission Funding',
        value: '€1.8 billion over five years',
        evidence: 'member states voted unanimously to commit €1.8 billion over five years',
        confidence: 0.95,
      },
      {
        label: 'Satellite Count',
        value: 'Four low-Earth orbit satellites',
        evidence: 'The mission will consist of four low-Earth orbit satellites',
        confidence: 0.95,
      },
    ],
    timelineCandidates: [
      { date: 'Late 2028', title: 'First Satellite Launch', description: 'Ariane 6 launch from Kourou' },
    ],
    contentBlocks: [
      {
        id: 'b1',
        type: 'paragraph',
        content:
          'The European Space Agency Council has approved the development of a flagship constellation of Earth observation satellites, dedicated to tracking greenhouse gas concentrations with unprecedented spatial resolution.',
      },
      { id: 'b2', type: 'heading', content: 'Funding and Technical Specifications', level: 2 },
      {
        id: 'b3',
        type: 'paragraph',
        content:
          'At a ministerial meeting in Paris, member states voted unanimously to commit €1.8 billion in funding over five years to initiate hardware procurement and industrial contracts for Project Aeolus-2.',
      },
    ],
    heroImage: null,
    sourceEvidence: [
      {
        claim: 'ESA approved €1.8B for Aeolus-2',
        evidenceText: 'member states voted unanimously to commit €1.8 billion',
        sourceUrl: 'https://example.com/esa-mission',
        confidence: 0.95,
      },
    ],
    overallConfidence: 0.94,
    confidenceLevel: 'high',
    hasConflicts: false,
    conflictDetails: null,
  };

  // ----------------------------------------------------
  // TEST 1: Normal Successful Extraction
  // ----------------------------------------------------
  console.log('--- 1. Normal Successful Extraction ---');
  {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(validExtractionPayload) } }],
          model: 'openai/gpt-oss-20b',
          usage: { prompt_tokens: 350, completion_tokens: 420, total_tokens: 770 },
        })
      );
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as any).port;

    try {
      const client = new NvidiaClient({
        baseUrl: `http://127.0.0.1:${port}`,
        apiKey: 'test-key',
        timeoutMs: 5000,
      });

      const res = await client.extractStructuredNews('System prompt', 'User prompt');
      testAssert(Boolean(res.rawJson), 'Test 1: Normal extraction returns rawJson');
      const parsed = JSON.parse(res.rawJson);
      const valid = ExtractedPayloadSchema.safeParse(parsed);
      testAssert(valid.success, 'Test 1b: Normal extraction strictly satisfies ExtractedPayloadSchema');
      testAssert(res.tokensUsed === 770, 'Test 1c: Usage metrics correctly captured');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }

  // ----------------------------------------------------
  // TEST 2: Timeout Handling (Aborts Cleanly, No Retry)
  // ----------------------------------------------------
  console.log('\n--- 2. Timeout Handling ---');
  {
    let callCount = 0;
    const server = http.createServer((req, res) => {
      callCount++;
      // Intentionally delay responding beyond the client timeout
      setTimeout(() => {
        try {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ choices: [{ message: { content: '{}' } }] }));
        } catch {}
      }, 2000);
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as any).port;

    try {
      const timeoutMs = 400;
      const client = new NvidiaClient({
        baseUrl: `http://127.0.0.1:${port}`,
        apiKey: 'test-key',
        timeoutMs,
      });

      const start = Date.now();
      let caughtErr: any = null;
      try {
        await client.extractStructuredNews('System', 'User');
      } catch (err: any) {
        caughtErr = err;
      }

      const elapsed = Date.now() - start;
      testAssert(caughtErr !== null, 'Test 2a: Timeout throws error cleanly');
      testAssert(caughtErr.message.includes(`Request timed out after ${timeoutMs}ms`), 'Test 2b: Error message specifies timeout');
      testAssert(elapsed >= timeoutMs && elapsed < timeoutMs + 1000, 'Test 2c: Aborts within timeout threshold without hanging');
      testAssert(callCount === 1, 'Test 2d: Timed-out request must NEVER be retried');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }

  // ----------------------------------------------------
  // TEST 3: API Failure Handling (500 Server Error vs 401 Client Error)
  // ----------------------------------------------------
  console.log('\n--- 3. API Failure Handling ---');
  {
    let serverErrCount = 0;
    const server500 = http.createServer((req, res) => {
      serverErrCount++;
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    });

    await new Promise<void>((resolve) => server500.listen(0, '127.0.0.1', () => resolve()));
    const port500 = (server500.address() as any).port;

    try {
      const client = new NvidiaClient({
        baseUrl: `http://127.0.0.1:${port500}`,
        apiKey: 'test-key',
        timeoutMs: 2000,
      });

      let err500: any = null;
      try {
        await client.extractStructuredNews('System', 'User');
      } catch (e: any) {
        err500 = e;
      }
      testAssert(err500 !== null && err500.message.includes('HTTP 500'), 'Test 3a: HTTP 500 handled cleanly');
      testAssert(serverErrCount === 2, 'Test 3b: Transient HTTP 500 server error retried exactly once (bounded retry)');
    } finally {
      await new Promise<void>((resolve) => server500.close(() => resolve()));
    }

    // 401 Client Error: must NOT retry
    let clientErrCount = 0;
    const server401 = http.createServer((req, res) => {
      clientErrCount++;
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized: Invalid API Key' }));
    });

    await new Promise<void>((resolve) => server401.listen(0, '127.0.0.1', () => resolve()));
    const port401 = (server401.address() as any).port;

    try {
      const client = new NvidiaClient({
        baseUrl: `http://127.0.0.1:${port401}`,
        apiKey: 'invalid-key',
        timeoutMs: 2000,
      });

      let err401: any = null;
      try {
        await client.extractStructuredNews('System', 'User');
      } catch (e: any) {
        err401 = e;
      }
      testAssert(err401 !== null && err401.message.includes('HTTP 401'), 'Test 3c: HTTP 401 Client Error caught cleanly');
      testAssert(clientErrCount === 1, 'Test 3d: HTTP 4xx Client Error is NEVER retried');
    } finally {
      await new Promise<void>((resolve) => server401.close(() => resolve()));
    }
  }

  // ----------------------------------------------------
  // TEST 4: Large Source Input Handling
  // ----------------------------------------------------
  console.log('\n--- 4. Large Source Input Handling ---');
  {
    // Generate large 12,000-character multi-paragraph article text
    const largeParagraph = 'The European Space Agency has confirmed extensive telemetry coverage of atmospheric carbon and methane plumes across continental European observation corridors. ';
    const largeArticleText = largeParagraph.repeat(80); // ~12,400 chars (~3,100 words)

    const promptInput: PromptInput = {
      title: 'ESA Atmospheric Monitoring Initiative',
      sourceName: 'ESA Science Portal',
      sourceUrl: 'https://example.com/large-article',
      categoryHint: 'science',
      articleText: largeArticleText,
    };

    const sysPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(promptInput);

    testAssert(userPrompt.includes(largeParagraph), 'Test 4a: Large source input preserved without truncation');
    testAssert(userPrompt.length > 12000, 'Test 4b: Full multi-thousand word context provided to prompt builder');

    // Verify NvidiaClient handles sending large payload without memory/buffer corruption
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        const parsedBody = JSON.parse(body);
        assert(parsedBody.messages[1].content.length > 12000, 'Server received full large prompt');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(validExtractionPayload) } }] }));
      });
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as any).port;

    try {
      const client = new NvidiaClient({
        baseUrl: `http://127.0.0.1:${port}`,
        apiKey: 'test-key',
        timeoutMs: 5000,
      });

      const res = await client.extractStructuredNews(sysPrompt, userPrompt);
      testAssert(Boolean(res.rawJson), 'Test 4c: Large source input processed and response returned cleanly');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }

  // ----------------------------------------------------
  // TEST 5: Large Structured Response Handling
  // ----------------------------------------------------
  console.log('\n--- 5. Large Structured Response Handling ---');
  {
    // Build a large 10-block payload with rich facts, entities, and evidence
    const largeBlocks = Array.from({ length: 10 }, (_, i) => ({
      id: `block-${i + 1}`,
      type: i % 3 === 1 ? ('heading' as const) : ('paragraph' as const),
      content: `Substantive journalistic content block ${i + 1} detailing comprehensive mission specifications, orbital parameters, sensor calibration, international policy ramifications, and long-term scientific objectives.`,
      level: i % 3 === 1 ? 2 : undefined,
    }));

    const largePayload = {
      ...validExtractionPayload,
      contentBlocks: largeBlocks,
      facts: Array.from({ length: 8 }, (_, i) => ({
        label: `Fact ${i + 1}`,
        value: `Value ${i + 1}`,
        evidence: `Direct matching source evidence quote for claim ${i + 1}`,
        confidence: 0.95,
      })),
      entities: Array.from({ length: 10 }, (_, i) => ({
        name: `Entity ${i + 1}`,
        type: 'organization' as const,
        relevance: 0.9,
      })),
    };

    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(largePayload) } }] }));
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as any).port;

    try {
      const client = new NvidiaClient({
        baseUrl: `http://127.0.0.1:${port}`,
        apiKey: 'test-key',
        timeoutMs: 5000,
      });

      const res = await client.extractStructuredNews('System', 'User');
      const parsed = JSON.parse(res.rawJson);
      const valid = ExtractedPayloadSchema.safeParse(parsed);
      testAssert(valid.success, 'Test 5a: Large multi-block structured payload passes schema validation');
      testAssert(valid.data?.contentBlocks.length === 10, 'Test 5b: All 10 content blocks parsed intact');
      testAssert(valid.data?.facts.length === 8, 'Test 5c: All 8 facts parsed intact');
      testAssert(valid.data?.entities.length === 10, 'Test 5d: All 10 entities parsed intact');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }

  // ----------------------------------------------------
  // TEST 6 & 7: ExtractionEngine Integration with Dead-Letter Handling
  // ----------------------------------------------------
  console.log('\n--- 6 & 7. ExtractionEngine Bounded Retry & Dead-Letter Behavior ---');
  {
    const mockRepo = new MockExtractionRepository();

    const sampleItem: DiscoveryItem = {
      id: 'disc-reliability-test-01',
      sourceId: 'src-test',
      sourceName: 'Test Source',
      sourceType: 'rss',
      canonicalUrl: 'https://example.com/test-item',
      sourceUrl: 'https://example.com/test-item',
      title: 'Reliability Test Article Headline',
      description: 'This is a comprehensive description for testing ExtractionEngine retry and dead-letter classification that exceeds one hundred and twenty characters.',
      publishedAt: '2026-09-30T10:00:00Z',
      discoveredAt: '2026-09-30T10:05:00Z',
      lastSeenAt: '2026-09-30T10:05:00Z',
      categoryHint: 'science',
      status: 'candidate',
      fingerprint: 'fp-rel-01',
      contentHash: 'ch-rel-01',
    };

    // 6. Successful Extraction via ExtractionEngine
    const successProvider = {
      extractStructuredNews: async () => ({
        rawJson: JSON.stringify(validExtractionPayload),
        model: 'openai/gpt-oss-20b',
        durationMs: 450,
      }),
    };

    const engine = new ExtractionEngine({
      llmProvider: successProvider,
      repository: mockRepo,
    });

    const candidate = await engine.extract(sampleItem, { dryRun: false });
    testAssert(candidate.extractionStatus === 'completed', 'Test 6a: ExtractionEngine produces completed candidate');
    testAssert(candidate.title === validExtractionPayload.title, 'Test 6b: Candidate title matches extracted output');

    // 7. Dead-Letter Behavior: Persistent LLM failure marks item as DEAD_LETTER_MAX_RETRIES
    let attemptsCount = 0;
    const persistentFailingProvider = {
      extractStructuredNews: async () => {
        attemptsCount++;
        throw new Error('[NvidiaClient] Request timed out after 35000ms');
      },
    };

    const deadLetterEngine = new ExtractionEngine({
      llmProvider: persistentFailingProvider,
      repository: mockRepo,
    });

    const deadLetterItem: DiscoveryItem = {
      ...sampleItem,
      id: 'disc-deadletter-test-02',
    };

    // First attempt -> fails, attempts recorded as 1
    try {
      await deadLetterEngine.extract(deadLetterItem, { dryRun: false });
    } catch {}

    const records = await mockRepo.getExtractions();
    const firstRecord = records.find((r) => r.discovery_item_id === deadLetterItem.id);
    testAssert(firstRecord?.status === 'failed', 'Test 7a: Failed extraction records failed status');
    testAssert(firstRecord?.error_code === 'LLM_INFERENCE_ERROR', 'Test 7b: First failure records LLM_INFERENCE_ERROR');

    // Second attempt -> reaches max retries -> DEAD_LETTER_MAX_RETRIES
    try {
      await deadLetterEngine.extract(deadLetterItem, { dryRun: false });
    } catch {}

    const updatedRecords = await mockRepo.getExtractions();
    const deadLetterRecord = updatedRecords
      .filter((r) => r.discovery_item_id === deadLetterItem.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    testAssert(deadLetterRecord?.error_code === 'DEAD_LETTER_MAX_RETRIES', 'Test 7c: Max retries exhausted assigns DEAD_LETTER_MAX_RETRIES');
    const retryDetails = JSON.parse(deadLetterRecord?.conflict_details || '{}');
    testAssert(retryDetails.deadLettered === true, 'Test 7d: conflict_details records deadLettered=true');
    testAssert(retryDetails.attempts === 2, 'Test 7e: conflict_details records exactly 2 attempts');
  }

  console.log('\n====================================================');
  console.log(`ALL ${passed}/${total} RELIABILITY TESTS PASSED WITH 100% SUCCESS`);
  console.log('====================================================\n');
}

runReliabilityTestSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
