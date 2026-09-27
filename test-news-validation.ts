/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE MERIDIAN — PHASE 7 AUTOMATED VERIFICATION SUITE
 * Independent News Fact Validation & Quality Gate Verification
 */

import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import {
  validateSourceUrl,
  validateCategoryHeuristic,
  validateTemporal,
  validateNumbers,
  validateQuotes,
  validateEntities,
  detectSensitiveTopics,
  checkOriginality,
  checkSourceSufficiency,
} from './src/services/validation/deterministicValidators';
import {
  ValidationEngine,
  CURRENT_VALIDATOR_VERSION,
} from './src/services/validation/ValidationEngine';
import { MockValidationRepository } from './src/data/repositories/MockValidationRepository';
import { SupabaseValidationRepository } from './src/data/repositories/SupabaseValidationRepository';
import {
  getSupabaseClient,
  getSupabaseServiceClient,
  isSupabaseConfigured,
  isServiceRoleConfigured,
} from './src/lib/supabase';
import { VALIDATION_FIXTURES } from './test/fixtures/validations/fixtures';

async function runPhase7TestSuite() {
  console.log('====================================================');
  console.log('THE MERIDIAN — PHASE 7 TEST SUITE');
  console.log('Independent News Fact Validation & Quality Gate');
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
  // TEST 1: Deterministic URL Validation
  // ----------------------------------------------------
  assert(validateSourceUrl('https://reuters.com/tech/ai').valid, 'Test 1a: Valid HTTPS URL passes');
  assert(validateSourceUrl('http://bbc.co.uk/news').valid, 'Test 1b: Valid HTTP URL passes');
  assert(!validateSourceUrl('').valid, 'Test 1c: Empty URL fails');
  assert(!validateSourceUrl('javascript:alert(1)').valid, 'Test 1d: Javascript scheme URL fails');
  assert(!validateSourceUrl('not-a-url').valid, 'Test 1e: Non-URL string fails');

  // ----------------------------------------------------
  // TEST 2: Deterministic Category Heuristic
  // ----------------------------------------------------
  const techCat = validateCategoryHeuristic('tech', 'Quantum processor breakthrough', 'IBM announces 1000 qubits computer chip');
  assert(techCat.status === 'match', 'Test 2a: Tech keywords correctly match tech category');

  const sportsConflict = validateCategoryHeuristic('sports', 'Federal Reserve cuts interest rates', 'Jerome Powell announced 25 basis point reduction in federal funds rate');
  assert(sportsConflict.status === 'mismatch', 'Test 2b: Financial news tagged as sports correctly flags mismatch');

  // ----------------------------------------------------
  // TEST 3: Deterministic Temporal Validation
  // ----------------------------------------------------
  const validTemp = validateTemporal('2026-09-25T10:00:00Z', '2026-09-25T08:00:00Z', 'News occurred today');
  assert(validTemp.status === 'valid', 'Test 3a: Plausible contemporary event date passes');

  const futureTemp = validateTemporal('2045-01-01T00:00:00Z', '2026-09-25T08:00:00Z', 'City council opens new playground');
  assert(futureTemp.status === 'mismatch', 'Test 3b: Far future event date without roadmap context flags mismatch');

  // ----------------------------------------------------
  // TEST 4: Deterministic Number Validation
  // ----------------------------------------------------
  const numCheck = validateNumbers(
    [{ label: 'Revenue', value: '$580 billion', evidence: '', confidence: 1 }],
    ['12.5% annual growth'],
    'Company reported $580 billion in sales with 12.5% annual growth'
  );
  assert(numCheck.result.status === 'valid', 'Test 4a: Supported numbers pass validation');

  const numFail = validateNumbers(
    [{ label: 'Funding', value: '$50 billion', evidence: '', confidence: 1 }],
    [],
    'Startup raised $50 million from angel investors'
  );
  assert(numFail.result.status === 'mismatch' || numFail.unsupportedNumbers.length > 0, 'Test 4b: Hallucinated $50 billion detected');

  // ----------------------------------------------------
  // TEST 5: Deterministic Quote Validation
  // ----------------------------------------------------
  const quotePass = validateQuotes(
    [{ type: 'blockquote', content: 'This milestone demonstrates tangible progress toward quantum utility' }],
    [],
    'Researchers said "This milestone demonstrates tangible progress toward quantum utility" during speech'
  );
  assert(quotePass.result.status === 'valid', 'Test 5a: Verifiable direct quote passes');

  const quoteFail = validateQuotes(
    [{ type: 'blockquote', content: 'We will replace all our human workforce by next week without exceptions' }],
    [],
    'The CEO announced standard quarterly earnings and routine factory maintenance'
  );
  assert(quoteFail.result.status === 'fabricated', 'Test 5b: Fabricated quotation identified');

  // ----------------------------------------------------
  // TEST 6: Deterministic Entity Validation
  // ----------------------------------------------------
  const entPass = validateEntities(
    [{ name: 'NASA', type: 'organization', relevance: 1 }],
    'NASA announced results from the telescope today'
  );
  assert(entPass.result.status === 'valid', 'Test 6a: Present entity passes');

  const entFail = validateEntities(
    [{ name: 'OpenAI Robotics', type: 'company', relevance: 1 }],
    'Excavators unearthed stone sarcophagi near Saqqara'
  );
  assert(entFail.result.status === 'unsupported', 'Test 6b: Missing entity flagged as unsupported');

  // ----------------------------------------------------
  // TEST 7: Sensitive Topic Detector
  // ----------------------------------------------------
  const warFlags = detectSensitiveTopics('Artillery strike', 'Reports confirm 14 casualties and dead', []);
  assert(warFlags.includes('war_casualties'), 'Test 7a: Detected war casualties sensitive topic');

  const medFlags = detectSensitiveTopics('Herbal tonic', 'Claims miracle cure for cancer without treatment', []);
  assert(medFlags.includes('medical_claims'), 'Test 7b: Detected unverified medical claims');

  // ----------------------------------------------------
  // TEST 8: Originality & Verbatim Copy Check
  // ----------------------------------------------------
  const longSource = 'A'.repeat(300);
  const copyCheck = checkOriginality(longSource, longSource);
  assert(copyCheck.status === 'suspicious', 'Test 8a: Detected verbatim block > 250 characters');

  const originalCheck = checkOriginality('Summary synthesized in concise original prose.', 'Completely different detailed source article.');
  assert(originalCheck.status === 'original', 'Test 8b: Original synthesis flagged as original');

  // ----------------------------------------------------
  // TEST 9: Source Sufficiency Check
  // ----------------------------------------------------
  assert(!checkSourceSufficiency('Too short snippet').sufficient, 'Test 9a: Snippet under 120 chars fails sufficiency');
  assert(checkSourceSufficiency('A'.repeat(150)).sufficient, 'Test 9b: Text over 120 chars passes sufficiency');

  // ----------------------------------------------------
  // TEST 10: Complete 20 Test Fixtures Verification
  // ----------------------------------------------------
  console.log('\n--- Running 20 Comprehensive Test Fixtures ---');
  const mockRepo = new MockValidationRepository();
  const engine = new ValidationEngine({ repository: mockRepo });

  let fixtureIdx = 1;
  for (const fixture of VALIDATION_FIXTURES) {
    const result = await engine.validate(fixture.input, { dryRun: false });
    assert(
      result.status === fixture.expectedStatus,
      `Fixture ${fixtureIdx} [${fixture.id}]: Status is '${fixture.expectedStatus}'`,
      `Got status '${result.status}', score: ${result.overallScore}`
    );

    if (fixture.expectedIssues) {
      for (const expectedCode of fixture.expectedIssues) {
        const hasCode = result.issues.some((iss) => iss.code === expectedCode);
        assert(
          hasCode,
          `Fixture ${fixtureIdx} [${fixture.id}]: Expected issue code '${expectedCode}'`,
          `Issues present: ${result.issues.map((i) => i.code).join(', ')}`
        );
      }
    }
    fixtureIdx++;
  }

  // ----------------------------------------------------
  // TEST 11: Deterministic Idempotency & Repository Lookup
  // ----------------------------------------------------
  const fixture1 = VALIDATION_FIXTURES[0];
  const firstRun = await engine.validate(fixture1.input);
  const secondRun = await engine.validate(fixture1.input);
  assert(firstRun.id === secondRun.id, 'Test 11a: Idempotent runs return identical validation ID');
  assert(firstRun.inputHash === secondRun.inputHash, 'Test 11b: Input hashes match exactly');

  // ----------------------------------------------------
  // TEST 12: Supabase Integration & RLS Hardening (If Configured)
  // ----------------------------------------------------
  if (isSupabaseConfigured()) {
    console.log('\n--- Verifying Supabase Database & Security Policies ---');

    // 1. Verify Public / Anonymous Client is Denied Access
    const anonClient = getSupabaseClient();
    const { data: anonData, error: anonError } = await anonClient
      .from('news_validations')
      .select('*')
      .limit(1);

    assert(
      anonError !== null || (anonData && anonData.length === 0),
      'Test 12a: Anonymous / public client cannot select from news_validations (RLS secured)'
    );

    // 2. Verify Service Role Client Has Full Internal Access
    if (isServiceRoleConfigured()) {
      const serviceClient = getSupabaseServiceClient();
      const supabaseRepo = new SupabaseValidationRepository(serviceClient);

      // Verify saving validation via service role
      // Create a test validation linked to first extraction
      const { data: existingExtractions } = await serviceClient
        .from('news_extractions')
        .select('id, title, summary, output_hash, category')
        .limit(1);

      if (existingExtractions && existingExtractions.length > 0) {
        const ext = existingExtractions[0];
        const testInput = {
          extraction: ext as any,
          sourceText: 'Comprehensive research and development across artificial intelligence systems occurred this week in tech.',
          sourceUrl: 'https://example.com/test',
        };

        const liveEngine = new ValidationEngine({ repository: supabaseRepo });
        const liveResult = await liveEngine.validate(testInput, { dryRun: false, forceRerun: true });
        assert(liveResult.extractionId === ext.id, 'Test 12b: Service role successfully persists validation to news_validations');

        const fetched = await supabaseRepo.getValidationById(liveResult.id);
        assert(fetched !== null && fetched.id === liveResult.id, 'Test 12c: Retrieved saved validation from Supabase');
      } else {
        console.log('ℹ️  Skipping live extraction link test (no extractions in news_extractions yet).');
      }
    }

    // 3. CRITICAL INVARIANT: stories table must remain intact (19 rows)
    const serviceClient = isServiceRoleConfigured() ? getSupabaseServiceClient() : anonClient;
    const { count: storiesCount, error: countErr } = await serviceClient
      .from('stories')
      .select('*', { count: 'exact', head: true });

    assert(
      countErr === null && storiesCount === 19,
      'Test 12d: CRITICAL INVARIANT: stories table count is exactly 19 (NEVER modified by Phase 7 validator)'
    );
  } else {
    console.log('\nℹ️  Supabase credentials not set, live DB tests skipped (Mock repository passed all tests).');
  }

  console.log('\n====================================================');
  console.log(`PHASE 7 TEST RESULTS: ${testsPassed} / ${totalTests} TESTS PASSED (100%)`);
  console.log('====================================================\n');
}

runPhase7TestSuite().catch((err) => {
  console.error('\n❌ Test Suite Aborted with Error:', err);
  process.exit(1);
});
