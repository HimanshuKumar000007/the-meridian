/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE MERIDIAN — CATEGORY TAXONOMY ALIGNMENT & CONTROLLED STORY VERIFICATION
 */

import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import {
  normalizeCategory,
  PLATFORM_CATEGORIES,
} from '../src/services/validation/categoryTaxonomy';
import {
  validateCategoryHeuristic,
} from '../src/services/validation/deterministicValidators';
import { ValidationEngine } from '../src/services/validation/ValidationEngine';
import { getSupabaseServiceClient } from '../src/lib/supabase';
import type { ValidationInput } from '../src/services/validation/ValidationEngine';
import type { ExtractedNewsCandidate } from '../src/types/extraction';

function makeCandidate(partial: Partial<ExtractedNewsCandidate>): ExtractedNewsCandidate {
  return {
    id: partial.id || `ext_${Math.random().toString(36).substring(2, 9)}`,
    discoveryItemId: partial.discoveryItemId || 'disc_123',
    title: partial.title || 'Default Title',
    dek: partial.dek || 'Default Dek',
    summary: partial.summary || 'Default Summary',
    summaryPoints: partial.summaryPoints || ['Key summary point overview'],
    category: partial.category || 'tech',
    subcategory: partial.subcategory || 'computing',
    classificationConfidence: 0.95,
    topics: ['technology'],
    status: 'normal',
    publishedAt: partial.publishedAt || '2026-09-25T10:00:00Z',
    eventDate: partial.eventDate || null,
    author: 'Editorial Desk',
    entities: partial.entities || [],
    facts: partial.facts || [],
    timelineCandidates: [],
    contentBlocks: partial.contentBlocks || [
      { type: 'paragraph', text: partial.summary || 'Default article content block.' },
    ],
    sources: [{ name: 'Reuters', url: 'https://www.reuters.com/technology/quantum-test' }],
    heroImage: 'https://images.unsplash.com/photo-tech',
    sourceEvidence: [],
    overallConfidence: 0.95,
    confidenceLevel: 'high',
    hasConflicts: false,
    extractionStatus: 'completed',
    model: 'meta/llama-3.2-11b-vision-instruct',
    promptVersion: 'v1.0.0-nv-extraction',
    inputHash: 'hash_input_fixture',
    outputHash: 'hash_output_fixture',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function runTaxonomySuite() {
  console.log('====================================================');
  console.log('THE MERIDIAN — CATEGORY TAXONOMY VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(cond: boolean, name: string, details?: string) {
    total++;
    if (!cond) {
      console.error(`❌ [FAIL] ${name}${details ? ` - ${details}` : ''}`);
      throw new Error(`Test failed: ${name}`);
    }
    console.log(`✅ [PASS] ${name}${details ? ` (${details})` : ''}`);
    passed++;
  }

  // --- 1. Alias Normalization Tests ---
  console.log('\n--- 1. Canonical Normalization Tests ---');
  assert(normalizeCategory('tech') === 'technology', 'Norm 1: tech -> technology');
  assert(normalizeCategory('artificial intelligence') === 'ai', 'Norm 2: artificial intelligence -> ai');
  assert(normalizeCategory('genai') === 'ai', 'Norm 3: genai -> ai');
  assert(normalizeCategory('machine-learning') === 'ai', 'Norm 4: machine-learning -> ai');
  assert(normalizeCategory('games') === 'gaming', 'Norm 5: games -> gaming');
  assert(normalizeCategory('biz') === 'business', 'Norm 6: biz -> business');
  assert(normalizeCategory('politics') === 'world', 'Norm 7: politics -> world');
  assert(normalizeCategory('infosec') === 'cybersecurity', 'Norm 8: infosec -> cybersecurity');
  assert(normalizeCategory('app') === 'apps', 'Norm 9: app -> apps');
  assert(normalizeCategory('semiconductors') === 'hardware', 'Norm 10: semiconductors -> hardware');

  // --- 2. The 7 Specific Taxonomy Compatibility Test Cases ---
  console.log('\n--- 2. Required 7 Taxonomy Behavior Tests ---');

  // Test A: Story clearly about AI + category ai -> valid match
  const aiSource = 'OpenAI announced GPT-5, a next-generation large language model featuring artificial intelligence agents and advanced deep learning transformer architectures.';
  const resA = validateCategoryHeuristic('ai', 'OpenAI Unveils GPT-5', aiSource);
  assert(resA.status === 'match' && resA.extractedCategory === 'ai', 'Test A: AI story + ai category -> match', `Got status: ${resA.status}, extracted: ${resA.extractedCategory}`);

  // Test B: Story clearly about tech + category technology -> valid match
  const techSource = 'Major cloud computing infrastructure providers deployed open source Linux server operating systems across global datacenter clusters.';
  const resB = validateCategoryHeuristic('technology', 'Cloud Datacenter Infrastructure Expands', techSource);
  assert(resB.status === 'match' && resB.extractedCategory === 'technology', 'Test B: Tech story + technology category -> match', `Got status: ${resB.status}, extracted: ${resB.extractedCategory}`);

  // Test C: Story clearly about AI + category gaming -> CATEGORY_MISMATCH
  const resC = validateCategoryHeuristic('gaming', 'OpenAI Unveils GPT-5', aiSource);
  assert(resC.status === 'mismatch', 'Test C: AI story + gaming category -> mismatch', `Got status: ${resC.status}`);

  // Test D: Story clearly about gaming + category ai -> CATEGORY_MISMATCH
  const gamingSource = 'Nintendo revealed new gameplay footage and console launch details for its latest RPG title running on Unreal Engine at the Tokyo esports tournament.';
  const resD = validateCategoryHeuristic('ai', 'Nintendo Announces New RPG', gamingSource);
  assert(resD.status === 'mismatch', 'Test D: Gaming story + ai category -> mismatch', `Got status: ${resD.status}`);

  // Test E: Story with strong AI/tech overlap + category ai or technology -> acceptable
  const overlapSource = 'Microsoft expanded its cloud computing datacenter infrastructure to host advanced artificial intelligence and large language model inference clusters.';
  const resE1 = validateCategoryHeuristic('ai', 'Microsoft Expands Compute Clusters', overlapSource);
  const resE2 = validateCategoryHeuristic('technology', 'Microsoft Expands Compute Clusters', overlapSource);
  assert(resE1.status === 'match' || resE1.status === 'acceptable', 'Test E1: AI/tech overlap + ai category -> acceptable/match', `Got status: ${resE1.status}`);
  assert(resE2.status === 'match' || resE2.status === 'acceptable', 'Test E2: AI/tech overlap + technology category -> acceptable/match', `Got status: ${resE2.status}`);

  // Test F: Story clearly about business + category ai -> CATEGORY_MISMATCH
  const bizSource = 'The Federal Reserve raised interest rates as inflation and corporate earnings impacted NYSE stock markets and quarterly revenue across retail banking.';
  const resF = validateCategoryHeuristic('ai', 'Federal Reserve Rate Decision', bizSource);
  assert(resF.status === 'mismatch', 'Test F: Business story + ai category -> mismatch', `Got status: ${resF.status}`);

  // Test G: Story clearly about world news + category ai -> CATEGORY_MISMATCH
  const worldSource = 'The United Nations summit concluded with foreign affairs diplomats and the prime minister signing a bilateral peacekeeping treaty on border security.';
  const resG = validateCategoryHeuristic('ai', 'UN Diplomats Sign Peace Treaty', worldSource);
  assert(resG.status === 'mismatch', 'Test G: World story + ai category -> mismatch', `Got status: ${resG.status}`);

  // --- 3. Full Controlled OpenAI/Microsoft Story Verification ---
  console.log('\n--- 3. Controlled OpenAI/Microsoft Story Full Pipeline Verification ---');
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    // Query Supabase for openai records
    const { data: allItems } = await supabase
      .from('discovered_feed_items')
      .select('id, title, url')
      .ilike('title', '%openai%')
      .limit(5);
    console.log('OpenAI items found in discovered_feed_items:', allItems);

    const { data: allVals } = await supabase
      .from('news_validations')
      .select('id, extraction_id, status, category_validation')
      .order('created_at', { ascending: false })
      .limit(5);
    console.log('Recent news_validations in DB:', allVals);

    const { data: item, error: itemErr } = await supabase
      .from('discovered_feed_items')
      .select('*')
      .eq('id', 'disc-openai-news-7809d81640affa0d')
      .maybeSingle();

    if (item) {
      console.log(`Discovered Item ID: ${item.id}`);
      console.log(`Discovered URL: ${item.url}`);
      console.log(`Original snippet length: ${item.raw_description?.length || 0} chars`);

      const engine = new ValidationEngine();
      const validationInput: ValidationInput = {
        extraction: makeCandidate({
          title: 'OpenAI and Microsoft Expand Strategic Compute Partnership with $10 Billion Agreement',
          summary: 'OpenAI and Microsoft have reached an expanded agreement securing massive dedicated cloud infrastructure for training and deploying next-generation frontier artificial intelligence models.',
          category: 'ai',
          facts: [
            { label: 'Total Investment', value: '$10 billion', evidence: 'expanded $10 billion cloud computing agreement', confidence: 0.95 },
            { label: 'Server Capacity', value: '100,000 dedicated GPU servers', evidence: '100,000 dedicated GPU servers and computing clusters', confidence: 0.95 },
          ],
          entities: [
            { name: 'OpenAI', type: 'organization', relevance: 0.95 },
            { name: 'Microsoft', type: 'organization', relevance: 0.95 },
          ],
          contentBlocks: [
            { type: 'paragraph', text: 'OpenAI and Microsoft expanded their cloud computing partnership.' },
          ],
        }),
        sourceText: (item.raw_description && item.raw_description.length > 200)
          ? item.raw_description
          : 'OpenAI and Microsoft have announced an expanded $10 billion cloud computing agreement. Under the deal, Microsoft will provide OpenAI with 100,000 dedicated GPU servers and computing clusters to train and deploy advanced artificial intelligence and large language models. The multi-year collaboration strengthens the existing alliance between the two technology leaders, enabling rapid scaling of generative AI capabilities across global enterprise customers.',
        sourceUrl: item.url || 'https://techcrunch.com/2026/03/24/openai-microsoft-compute-deal/',
        publishedAt: '2026-03-24T00:00:00.000Z',
      };

      const validationOutput = await engine.validate(validationInput, { dryRun: true });
      console.log('Validation Engine Result for Controlled Story:');
      console.log(`- Status: ${validationOutput.status}`);
      console.log(`- Score: ${validationOutput.overallScore}`);
      console.log(`- Category Result: status=${validationOutput.categoryValidation.status}, expected=${validationOutput.categoryValidation.expectedCategory}, extracted=${validationOutput.categoryValidation.extractedCategory}`);
      console.log(`- Issues: ${JSON.stringify(validationOutput.issues.map((i) => i.code))}`);

      assert(validationOutput.categoryValidation.status === 'match' || validationOutput.categoryValidation.status === 'acceptable', 'Controlled Story: Category is valid match or acceptable');
      assert(!validationOutput.issues.some((i) => i.code === 'CATEGORY_MISMATCH'), 'Controlled Story: No CATEGORY_MISMATCH issue');
      assert(validationOutput.status === 'valid', 'Controlled Story: Overall status is valid');
    } else {
      console.log('Testing with simulated candidate:');
      const engine = new ValidationEngine();
      const validationInput: ValidationInput = {
        extraction: makeCandidate({
          title: 'OpenAI and Microsoft Expand Strategic Compute Partnership with $10 Billion Agreement',
          summary: 'OpenAI and Microsoft expand their artificial intelligence partnership with $10 billion in dedicated cloud infrastructure and 100,000 servers.',
          category: 'ai',
          facts: [
            { label: 'Total Investment', value: '$10 billion', evidence: 'expanded $10 billion cloud computing agreement', confidence: 0.95 },
            { label: 'Server Capacity', value: '100,000 dedicated GPU servers', evidence: '100,000 dedicated GPU servers and computing clusters', confidence: 0.95 },
          ],
          entities: [
            { name: 'OpenAI', type: 'organization', relevance: 0.95 },
            { name: 'Microsoft', type: 'organization', relevance: 0.95 },
          ],
          contentBlocks: [
            { type: 'paragraph', text: 'OpenAI and Microsoft expanded their cloud computing partnership.' },
          ],
        }),
        sourceText: 'OpenAI and Microsoft have announced an expanded $10 billion cloud computing agreement. Under the deal, Microsoft will provide OpenAI with 100,000 dedicated GPU servers and computing clusters to train and deploy advanced artificial intelligence and large language models. The multi-year collaboration strengthens the existing alliance between the two technology leaders, enabling rapid scaling of generative AI capabilities across global enterprise customers.',
        sourceUrl: 'https://techcrunch.com/2026/03/24/openai-microsoft-compute-deal/',
        publishedAt: '2026-03-24T00:00:00.000Z',
      };
      const validationOutput = await engine.validate(validationInput, { dryRun: true });
      console.log('Simulated validation output:', {
        status: validationOutput.status,
        overallScore: validationOutput.overallScore,
        claimCoverage: validationOutput.claimCoverage,
        categoryValidation: validationOutput.categoryValidation,
        issues: validationOutput.issues,
      });
      assert(validationOutput.status === 'valid', 'Simulated Controlled Story: Status is valid');
      assert(!validationOutput.issues.some((i) => i.code === 'CATEGORY_MISMATCH'), 'Simulated Controlled Story: No CATEGORY_MISMATCH');
    }

    // --- 4. Critical Platform Invariants ---
    console.log('\n--- 4. Platform Safety & Publication Invariants ---');
    const { count: publishedCount, error: pubErr } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');

    console.log(`Database published stories count: ${publishedCount}`);
    assert(publishedCount === 19, 'Platform Invariant 1: Published stories count is strictly 19', `Count is ${publishedCount}`);

    const { count: queueCount, error: queueErr } = await supabase
      .from('publication_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued');

    console.log(`Database publication_queue count: ${queueCount}`);
    assert(queueCount === 0, 'Platform Invariant 2: Publication queue count is strictly 0', `Count is ${queueCount}`);

    const automationPublishing = process.env.AUTOMATION_PUBLISHING_ENABLED;
    console.log(`AUTOMATION_PUBLISHING_ENABLED: ${automationPublishing}`);
    assert(automationPublishing !== 'true', 'Platform Invariant 3: AUTOMATION_PUBLISHING_ENABLED is false');
  }

  console.log(`\n====================================================`);
  console.log(`ALL TAXONOMY TESTS PASSED: ${passed} / ${total} (100%)`);
  console.log(`====================================================\n`);
}

runTaxonomySuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
