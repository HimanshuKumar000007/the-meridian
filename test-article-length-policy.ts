/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * 700-Word Minimum Article Policy Verification Suite
 *
 * Comprehensive 20-Scenario Verification:
 *  1. Article with 699 words is BLOCKED by publication gate
 *  2. Article with 700 words PASSES the length check
 *  3. Article with 701 words PASSES the length check
 *  4. Article with 1,500 words PASSES the length check
 *  5. Article with 3,000 words PASSES the length check
 *  6. Article with 5,000+ words PASSES the length check (no ceiling)
 *  7. Headline / dek are NOT counted in the 700-word calculation
 *  8. Image captions and credits are NOT counted
 *  9. UI elements and navigation boilerplate are NOT counted
 * 10. Author / date / metadata are NOT counted
 * 11. Raw HTML tags / markdown markers are stripped before counting
 * 12. Short source text recovery handles length gracefully (< 120 chars)
 * 13. Multi-source synthesis produces valid 700+ word candidate
 * 14. Insufficient source evidence results in HOLD / review, NOT padded article
 * 15. Repetitive filler text is detected / prevented
 * 16. Hallucinated / unsupported claims are caught by validation regardless of article length
 * 17. Post-validation content mutation invalidates prior validation
 * 18. Content hash mismatch blocks publication
 * 19. A fully valid 700+ word article passes all gates and is eligible for publication
 * 20. An otherwise valid 500-word article is held by publication gate
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import {
  countWords,
  countArticleBodyWords,
  extractArticleBodyProse,
  isArticleBodyLengthValid,
  detectFillerText,
  MIN_ARTICLE_BODY_WORDS,
} from './src/utils/wordCount';
import { PublicationGateService } from './src/services/publishing/PublicationGateService';
import { PublicationPolicyService } from './src/services/publishing/PublicationPolicyService';
import { ValidationEngine } from './src/services/validation/ValidationEngine';
import { checkSourceSufficiency } from './src/services/validation/deterministicValidators';
import type { ArticleBlock } from './src/types/story';
import {
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
    throw new Error(`Assertion failed: ${testName}${detail ? ` (${detail})` : ''}`);
  }
}

/**
 * Deterministically generates diverse, realistic journalistic prose with exactly targetWords.
 * Avoids repetition so vocabulary diversity remains natural (> 0.45).
 */
const JOURNALISTIC_DICTIONARY = [
  'scientific', 'researchers', 'completed', 'comprehensive', 'orbital', 'evaluations',
  'across', 'multiple', 'advanced', 'observation', 'laboratories', 'international',
  'consortium', 'telemetry', 'demonstrated', 'unprecedented', 'precision', 'during',
  'atmospheric', 'monitoring', 'procedures', 'subsequent', 'engineering', 'reports',
  'confirmed', 'structural', 'integrity', 'remained', 'nominal', 'throughout',
  'deployment', 'phases', 'meanwhile', 'operational', 'specialists', 'formulated',
  'detailed', 'longitudinal', 'frameworks', 'ensuring', 'equitable', 'distribution',
  'technical', 'innovations', 'independent', 'regulators', 'endorsed', 'stringent',
  'environmental', 'standards', 'governing', 'wireless', 'frequency', 'allocations',
  'furthermore', 'institutional', 'investors', 'highlighted', 'substantial', 'economic',
  'efficiencies', 'derived', 'from', 'collaborative', 'manufacturing', 'networks',
  'extending', 'benefits', 'across', 'participating', 'member', 'states',
  'representatives', 'convened', 'bilateral', 'summits', 'accelerating', 'adoption',
  'renewable', 'energy', 'architectures', 'addressing', 'seasonal', 'fluctuations',
  'robust', 'computational', 'simulations', 'substantiated', 'optimistic', 'projections',
  'securing', 'broad', 'consensus', 'among', 'key', 'stakeholders', 'globally'
];

function generateProse(targetWords: number): string {
  const words: string[] = [];
  let dictIdx = 0;

  for (let i = 0; i < targetWords; i++) {
    // Generate unique cyclic variations
    const base = JOURNALISTIC_DICTIONARY[dictIdx % JOURNALISTIC_DICTIONARY.length];
    const salt = Math.floor(i / JOURNALISTIC_DICTIONARY.length);
    const word = salt > 0 ? `${base}${salt}` : base;
    words.push(word);
    dictIdx++;
  }

  // Capitalize every 15th word to form realistic sentences
  return words
    .map((w, idx) => (idx % 15 === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
    .replace(/(?:\s+\w+){14}/g, '$&.') + '.';
}

function makeStoryWithWords(wordCount: number, overrides: any = {}) {
  // Heading has 4 words ('Overview and Strategic Background')
  const proseWords = Math.max(0, wordCount - 4);
  const prose = generateProse(proseWords);
  return makePublishingStory({
    content: [
      {
        type: 'heading',
        level: 2,
        text: 'Overview and Strategic Background',
      },
      {
        type: 'paragraph',
        text: prose,
      },
    ],
    ...overrides,
  });
}

async function runPolicyTestSuite() {
  console.log('====================================================');
  console.log('THE MERIDIAN — 700-WORD MINIMUM ARTICLE POLICY');
  console.log('Independent Quality, Safety & Length Verification');
  console.log('====================================================\n');

  const policy = new PublicationPolicyService();
  const gate = new PublicationGateService(policy);

  // ----------------------------------------------------
  // SCENARIO 1: Article with 699 words is BLOCKED by publication gate
  // ----------------------------------------------------
  console.log('--- Scenario 1: Boundary Check (699 Words) ---');
  {
    // Heading has 4 words, paragraph needs 695 words -> total 699 words
    const story699 = makePublishingStory({
      content: [
        { type: 'heading', level: 2, text: 'Strategic Mission Background Overview' },
        { type: 'paragraph', text: generateProse(695) },
      ],
    });
    const actualWords = countArticleBodyWords(story699.content);
    assert(actualWords === 699, 'Scenario 1a: Story has exactly 699 substantive body words', `Found: ${actualWords}`);

    const res699 = gate.evaluate({
      story: story699,
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    });

    assert(res699.decision === 'HOLD', 'Scenario 1b: 699-word article is strictly BLOCKED with HOLD');
    assert(res699.reason === 'INSUFFICIENT_ARTICLE_LENGTH', 'Scenario 1c: Reason is INSUFFICIENT_ARTICLE_LENGTH');
    assert(
      res699.blockingIssues.some((iss) => iss.includes('699 words') && iss.includes('700-word minimum policy')),
      'Scenario 1d: Blocking issue describes 699 words vs 700 required'
    );
  }

  // ----------------------------------------------------
  // SCENARIO 2: Article with 700 words PASSES the length check
  // ----------------------------------------------------
  console.log('\n--- Scenario 2: Boundary Threshold (700 Words) ---');
  {
    // Heading 4 words + paragraph 696 words = 700 words
    const story700 = makePublishingStory({
      content: [
        { type: 'heading', level: 2, text: 'Strategic Mission Background Overview' },
        { type: 'paragraph', text: generateProse(696) },
      ],
    });
    const actualWords = countArticleBodyWords(story700.content);
    assert(actualWords === 700, 'Scenario 2a: Story has exactly 700 substantive body words', `Found: ${actualWords}`);

    const res700 = gate.evaluate({
      story: story700,
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    });

    assert(res700.decision === 'PUBLISH', 'Scenario 2b: 700-word article passes length gate and qualifies for PUBLISH');
    assert(res700.reason === 'AUTO_PUBLISH_VALID_CREATE', 'Scenario 2c: Reason is AUTO_PUBLISH_VALID_CREATE');
  }

  // ----------------------------------------------------
  // SCENARIO 3: Article with 701 words PASSES the length check
  // ----------------------------------------------------
  console.log('\n--- Scenario 3: Boundary Check (701 Words) ---');
  {
    const story701 = makePublishingStory({
      content: [
        { type: 'heading', level: 2, text: 'Strategic Mission Background Overview' },
        { type: 'paragraph', text: generateProse(697) },
      ],
    });
    const actualWords = countArticleBodyWords(story701.content);
    assert(actualWords === 701, 'Scenario 3a: Story has exactly 701 substantive body words', `Found: ${actualWords}`);

    const res701 = gate.evaluate({
      story: story701,
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    });

    assert(res701.decision === 'PUBLISH', 'Scenario 3b: 701-word article passes length gate and qualifies for PUBLISH');
  }

  // ----------------------------------------------------
  // SCENARIO 4: Article with 1,500 words PASSES the length check
  // ----------------------------------------------------
  console.log('\n--- Scenario 4: Standard Long-Form (1,500 Words) ---');
  {
    const story1500 = makePublishingStory({
      content: [
        { type: 'heading', level: 2, text: 'Strategic Mission Background Overview' },
        { type: 'paragraph', text: generateProse(1496) },
      ],
    });
    const actualWords = countArticleBodyWords(story1500.content);
    assert(actualWords === 1500, 'Scenario 4a: Story has exactly 1,500 words', `Found: ${actualWords}`);

    const res1500 = gate.evaluate({
      story: story1500,
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    });

    assert(res1500.decision === 'PUBLISH', 'Scenario 4b: 1,500-word article passes without limitation');
  }

  // ----------------------------------------------------
  // SCENARIO 5: Article with 3,000 words PASSES the length check
  // ----------------------------------------------------
  console.log('\n--- Scenario 5: Investigative Depth (3,000 Words) ---');
  {
    const story3000 = makePublishingStory({
      content: [
        { type: 'heading', level: 2, text: 'Strategic Mission Background Overview' },
        { type: 'paragraph', text: generateProse(2996) },
      ],
    });
    const actualWords = countArticleBodyWords(story3000.content);
    assert(actualWords === 3000, 'Scenario 5a: Story has exactly 3,000 words', `Found: ${actualWords}`);

    const res3000 = gate.evaluate({
      story: story3000,
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    });

    assert(res3000.decision === 'PUBLISH', 'Scenario 5b: 3,000-word deep-dive article passes with PUBLISH');
  }

  // ----------------------------------------------------
  // SCENARIO 6: Article with 5,000+ words PASSES (NO artificial ceiling)
  // ----------------------------------------------------
  console.log('\n--- Scenario 6: No Artificial Ceiling (5,200 Words) ---');
  {
    const story5200 = makePublishingStory({
      content: [
        { type: 'heading', level: 2, text: 'Comprehensive Multi-Disciplinary Dossier and Historical Survey' },
        { type: 'paragraph', text: generateProse(5193) },
      ],
    });
    const actualWords = countArticleBodyWords(story5200.content);
    assert(actualWords >= 5000, 'Scenario 6a: Story has over 5,000 words', `Found: ${actualWords}`);

    const res5200 = gate.evaluate({
      story: story5200,
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    });

    assert(res5200.decision === 'PUBLISH', 'Scenario 6b: 5,000+ word article passes; confirms NO artificial ceiling exists');
  }

  // ----------------------------------------------------
  // SCENARIO 7: Headline / dek are NOT counted in the 700-word calculation
  // ----------------------------------------------------
  console.log('\n--- Scenario 7: Headline & Dek Exclusion ---');
  {
    // 680 body words + 12 title words + 18 dek words = 710 total words.
    // If title and dek were erroneously counted, it would be 710.
    // But article body words must be strictly 680 -> BLOCKED.
    const storyWithTitleDek = makePublishingStory({
      title: 'European Space Agency Successfully Deploys Revolutionary Orbital Solar Energy Power Collector Over Atlantic',
      summary: 'Advanced orbital platform demonstrates wireless high-intensity coherent laser power transmission to remote marine ground reception facilities during historic trial run.',
      content: [
        { type: 'heading', level: 2, text: 'Technical Architecture' },
        { type: 'paragraph', text: generateProse(678) },
      ],
    });

    const bodyWordCount = countArticleBodyWords(storyWithTitleDek);
    assert(bodyWordCount === 680, 'Scenario 7a: Body word count strictly excludes title and dek', `Count: ${bodyWordCount}`);

    const res = gate.evaluate({
      story: storyWithTitleDek,
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    });

    assert(res.decision === 'HOLD', 'Scenario 7b: Article is held despite title/dek words pushing total over 700');
    assert(res.reason === 'INSUFFICIENT_ARTICLE_LENGTH', 'Scenario 7c: Reason is INSUFFICIENT_ARTICLE_LENGTH');
  }

  // ----------------------------------------------------
  // SCENARIO 8: Image captions and credits are NOT counted
  // ----------------------------------------------------
  console.log('\n--- Scenario 8: Image Captions & Credits Exclusion ---');
  {
    // 680 body words + 30 caption words + 10 credit words = 720 total words.
    // Image blocks must be strictly ignored.
    const storyWithImage = makePublishingStory({
      content: [
        { type: 'heading', level: 2, text: 'Mission Overview' },
        { type: 'paragraph', text: generateProse(678) },
        {
          type: 'image',
          url: 'https://images.unsplash.com/photo-space',
          alt: 'A detailed diagram of the orbital solar collector deploying over the southern ocean basin',
          caption: 'High resolution artist illustration depicting the deployable photovoltaic concentrator arrays capturing uninterrupted solar irradiance across the upper ionosphere for transmission back to Earth.',
          credit: 'European Space Agency and Consortium Media Laboratory / Dr. Marcus Vance',
        },
      ],
    });

    const bodyWordCount = countArticleBodyWords(storyWithImage);
    assert(bodyWordCount === 680, 'Scenario 8a: Body word count strictly ignores image captions and credits', `Count: ${bodyWordCount}`);

    const res = gate.evaluate({
      story: storyWithImage,
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    });

    assert(res.decision === 'HOLD', 'Scenario 8b: Article is held because image captions/credits do not count');
    assert(res.reason === 'INSUFFICIENT_ARTICLE_LENGTH', 'Scenario 8c: Reason is INSUFFICIENT_ARTICLE_LENGTH');
  }

  // ----------------------------------------------------
  // SCENARIO 9: UI elements and navigation boilerplate are NOT counted
  // ----------------------------------------------------
  console.log('\n--- Scenario 9: UI & Navigation Elements Exclusion ---');
  {
    const storyWithUI = makePublishingStory({
      content: [
        { type: 'heading', level: 2, text: 'Technical Assessment' },
        { type: 'paragraph', text: generateProse(678) },
        { type: 'nav', text: 'Home > World News > Technology > Aerospace Infrastructure > Live Coverage' } as any,
        { type: 'ad', text: 'Subscribe to The Meridian Daily Briefing for exclusive global intelligence updates' } as any,
      ],
    });

    const bodyWordCount = countArticleBodyWords(storyWithUI);
    assert(bodyWordCount === 680, 'Scenario 9a: UI, nav, and ad blocks are strictly excluded from word count', `Count: ${bodyWordCount}`);

    const res = gate.evaluate({
      story: storyWithUI,
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    });

    assert(res.decision === 'HOLD', 'Scenario 9b: UI and navigation elements cannot push article over 700 words');
  }

  // ----------------------------------------------------
  // SCENARIO 10: Author / date / metadata are NOT counted
  // ----------------------------------------------------
  console.log('\n--- Scenario 10: Author Bio & Metadata Exclusion ---');
  {
    const storyWithAuthor = makePublishingStory({
      author: {
        id: 'auth-lead-investigator',
        name: 'Dr. Katherine Hawthorne, Senior Science Correspondent and Editorial Director',
        role: 'Aerospace Engineering Analyst, Former Research Fellow at Jet Propulsion Laboratory',
        bio: 'Katherine Hawthorne has covered European and American space infrastructure for over fifteen years, specializing in orbital propulsion dynamics and international regulatory policy for advanced satellite constellations.',
      },
      content: [
        { type: 'heading', level: 2, text: 'Scientific Summary' },
        { type: 'paragraph', text: generateProse(678) },
      ],
    });

    const bodyWordCount = countArticleBodyWords(storyWithAuthor);
    assert(bodyWordCount === 680, 'Scenario 10a: Author bio and credentials excluded from body word count', `Count: ${bodyWordCount}`);

    const res = gate.evaluate({
      story: storyWithAuthor,
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    });

    assert(res.decision === 'HOLD', 'Scenario 10b: Author metadata cannot satisfy 700-word policy');
  }

  // ----------------------------------------------------
  // SCENARIO 11: Raw HTML tags / markdown markers are stripped before counting
  // ----------------------------------------------------
  console.log('\n--- Scenario 11: Markup Stripping & Deterministic Tokenization ---');
  {
    const htmlSnippet = `<div class="article-body-wrapper" id="content-main">
      <h2>Section Header</h2>
      <p>Researchers verified <strong>breakthrough</strong> results in <em>laboratory</em> tests.</p>
      <!-- Editorial internal comment: verified by desk -->
      <a href="https://example.com/source">Primary documentation</a>
    </div>`;

    // Words should only be: "Section", "Header", "Researchers", "verified", "breakthrough", "results", "in", "laboratory", "tests", "Primary", "documentation" = 11 words
    const count = countWords(htmlSnippet);
    assert(count === 11, 'Scenario 11a: HTML tags, comments, and attributes stripped cleanly', `Got count: ${count}`);

    const mdSnippet = `## Section Header
Researchers verified **breakthrough** results in *laboratory* tests.
[Primary documentation](https://example.com/source)
---
> Quote block with key facts.`;

    const mdCount = countWords(mdSnippet);
    assert(mdCount === 16, 'Scenario 11b: Markdown syntax markers stripped before counting', `Got count: ${mdCount}`);
  }

  // ----------------------------------------------------
  // SCENARIO 12: Short source text recovery handles length gracefully
  // ----------------------------------------------------
  console.log('\n--- Scenario 12: Short Source Recovery & Sufficiency ---');
  {
    const shortSource = 'Too short text snippet from feed.';
    const sufficiency = checkSourceSufficiency(shortSource);
    assert(!sufficiency.sufficient, 'Scenario 12a: Source text < 120 chars fails sufficiency check');
    assert(sufficiency.length === 33, 'Scenario 12b: Character length measured accurately');

    const validationEngine = new ValidationEngine({ enforceArticleLength: true });
    const valResult = await validationEngine.validate({
      extraction: makePublishingExtraction({}),
      sourceText: shortSource,
      sourceUrl: 'https://example.com/short',
    });

    assert(valResult.status === 'insufficient_evidence', 'Scenario 12c: Routed safely to insufficient_evidence, preventing premature expansion');
  }

  // ----------------------------------------------------
  // SCENARIO 13: Multi-source synthesis produces valid 700+ word candidate
  // ----------------------------------------------------
  console.log('\n--- Scenario 13: Multi-Source Synthesis Candidate ---');
  {
    const multiSourceStory = makePublishingStory({});
    const candidateExtraction = makePublishingExtraction({
      category: 'space',
      contentBlocks: multiSourceStory.content,
      sources: [
        { name: 'Primary Reuters Report', url: 'https://reuters.com/tech/space-synthesis' },
        { name: 'Secondary ESA Bulletin', url: 'https://esa.int/news/telemetry' },
      ],
    });

    const validationEngine = new ValidationEngine({ enforceArticleLength: true });
    const valResult = await validationEngine.validate({
      extraction: candidateExtraction,
      sourceText: 'The European Space Agency launched a clean energy satellite into sun-synchronous orbit from French Guiana on Ariane 6 at 720 km altitude. Solar collector arrays deployed autonomously. Atmospheric monitoring sensors will transmit telemetry to ground stations in Australia. International consortium partners across Europe confirmed operational success.',
      sourceUrl: 'https://esa.int/news/clean-energy',
    });

    assert(valResult.status === 'valid', 'Scenario 13a: Valid 750-word synthesized candidate passes validation');
    assert(valResult.articleBodyWordCount! >= 700, 'Scenario 13b: Article body word count recorded as >= 700');

    const pubResult = gate.evaluate({
      story: makePublishingStory({
        title: candidateExtraction.title,
        summary: candidateExtraction.summary,
        category: candidateExtraction.category,
        content: candidateExtraction.contentBlocks,
        facts: candidateExtraction.facts,
        sources: candidateExtraction.sources,
      }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: valResult,
      extraction: candidateExtraction,
    });

    assert(pubResult.decision === 'PUBLISH', 'Scenario 13c: Synthesized candidate passes publication gate');
  }

  // ----------------------------------------------------
  // SCENARIO 14: Insufficient source evidence results in HOLD / review, NOT padded article
  // ----------------------------------------------------
  console.log('\n--- Scenario 14: Insufficient Source Evidence Routed to HOLD ---');
  {
    // A 300-word candidate with enforceArticleLength: true
    const shortExtraction = makePublishingExtraction({
      contentBlocks: [
        { type: 'heading', level: 2, text: 'Brief Update' },
        { type: 'paragraph', text: generateProse(298) },
      ],
    });

    const validationEngine = new ValidationEngine({ enforceArticleLength: true });
    const valResult = await validationEngine.validate({
      extraction: shortExtraction,
      sourceText: 'Valid source text that is at least 150 characters long to pass the minimum sufficiency threshold for testing short article behavior without failing on source length.',
      sourceUrl: 'https://example.com/brief',
    });

    assert(valResult.status === 'needs_review', 'Scenario 14a: Under-700 candidate receives needs_review');
    assert(
      valResult.issues.some((i) => i.code === 'INSUFFICIENT_ARTICLE_LENGTH'),
      'Scenario 14b: Validation flags INSUFFICIENT_ARTICLE_LENGTH issue'
    );

    const pubResult = gate.evaluate({
      story: makePublishingStory({ content: shortExtraction.contentBlocks }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'HOLD' }),
      validation: valResult,
      extraction: shortExtraction,
    });

    assert(pubResult.decision === 'HOLD', 'Scenario 14c: Held by publication gate; not published or padded');
  }

  // ----------------------------------------------------
  // SCENARIO 15: Repetitive filler text is detected / prevented
  // ----------------------------------------------------
  console.log('\n--- Scenario 15: Repetitive Filler & Looping Detection ---');
  {
    // Candidate attempting to pad to 750 words by repeating the exact same sentence 50 times
    const repeatedSentence = 'The development continues to represent a notable benchmark for ongoing sector initiatives across the region.';
    const paddedProse = Array(50).fill(repeatedSentence).join(' ');

    const fillerCheck = detectFillerText(paddedProse);
    assert(fillerCheck.hasFiller === true, 'Scenario 15a: Repetitive sentence looping flagged as filler');
    assert(fillerCheck.maxSentenceRepetitions === 50, 'Scenario 15b: Repetition count detected accurately');

    const paddedStory = makePublishingStory({
      content: [
        { type: 'heading', level: 2, text: 'Overview' },
        { type: 'paragraph', text: paddedProse },
      ],
    });

    const res = gate.evaluate({
      story: paddedStory,
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    });

    assert(res.decision === 'HOLD', 'Scenario 15c: Padded filler candidate held by publication gate');
    assert(res.reason === 'MALFORMED_CONTENT', 'Scenario 15d: Reason is MALFORMED_CONTENT');
  }

  // ----------------------------------------------------
  // SCENARIO 16: Hallucinated / unsupported claims caught by validation regardless of article length
  // ----------------------------------------------------
  console.log('\n--- Scenario 16: Hallucinated Facts Blocked in Long Article ---');
  {
    const longCandidate = makePublishingExtraction({
      contentBlocks: [
        { type: 'heading', level: 2, text: 'Financial and Technical Assessment' },
        { type: 'paragraph', text: generateProse(746) },
      ],
      facts: [
        { label: 'Unverified Cost', value: '$950 billion', evidence: '', confidence: 1.0 },
      ],
    });

    const validationEngine = new ValidationEngine({ enforceArticleLength: true });
    const valResult = await validationEngine.validate({
      extraction: longCandidate,
      sourceText:
        'The official mission budget was reported as $2.4 billion according to the ministerial commission meeting held in Paris today with representatives from participating nations.',
      sourceUrl: 'https://example.com/budget',
    });

    assert(valResult.status === 'rejected', 'Scenario 16a: 750-word article with fabricated numbers rejected');
    assert(
      valResult.issues.some((i) => i.code === 'NUMBER_MISMATCH'),
      'Scenario 16b: NUMBER_MISMATCH issue identified'
    );

    const pubResult = gate.evaluate({
      story: makePublishingStory({ content: longCandidate.contentBlocks }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'REJECT' }),
      validation: valResult,
      extraction: longCandidate,
    });

    assert(pubResult.decision === 'REJECT', 'Scenario 16c: Rejected validation hard blocks publication');
  }

  // ----------------------------------------------------
  // SCENARIO 17: Post-validation content mutation invalidates prior validation
  // ----------------------------------------------------
  console.log('\n--- Scenario 17: Post-Validation Mutation Invalidation ---');
  {
    const originalBlocks: ArticleBlock[] = [
      { type: 'heading', level: 2, text: 'Original Clean Report' },
      { type: 'paragraph', text: generateProse(746) },
    ];
    const originalStory = makePublishingStory({ content: originalBlocks });
    const originalHash = PublicationGateService.computeContentHash(originalStory);

    // Verify initial integrity
    assert(
      ValidationEngine.verifyContentIntegrity(originalStory, originalHash),
      'Scenario 17a: Clean story matches validated content hash'
    );

    // Mutate content blocks after validation
    const mutatedStory = {
      ...originalStory,
      content: [
        ...originalBlocks,
        { type: 'paragraph', text: 'Post-validation unverified amendment injected here.' },
      ] as ArticleBlock[],
    };

    assert(
      !ValidationEngine.verifyContentIntegrity(mutatedStory, originalHash),
      'Scenario 17b: Mutated story fails content integrity verification against validated hash'
    );
  }

  // ----------------------------------------------------
  // SCENARIO 18: Content hash mismatch blocks publication
  // ----------------------------------------------------
  console.log('\n--- Scenario 18: Content Hash Mismatch Gate Check ---');
  {
    const originalStory = makeStoryWithWords(750);
    const originalHash = PublicationGateService.computeContentHash(originalStory);

    // Mutate the story content while passing the original validated hash
    const mutatedStory = {
      ...originalStory,
      content: [
        { type: 'heading', level: 2, text: 'Original Heading' },
        { type: 'paragraph', text: generateProse(748) + ' Modified post-validation text.' },
      ] as ArticleBlock[],
    };

    const res = gate.evaluate({
      story: mutatedStory,
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid', contentHash: originalHash } as any),
      extraction: makePublishingExtraction({}),
    });

    assert(res.decision === 'HOLD', 'Scenario 18a: Mutated story held due to content hash mismatch');
    assert(res.reason === 'CONTENT_HASH_MISMATCH', 'Scenario 18b: Reason is CONTENT_HASH_MISMATCH');
  }

  // ----------------------------------------------------
  // SCENARIO 19: A fully valid 700+ word article passes all gates and is eligible for publication
  // ----------------------------------------------------
  console.log('\n--- Scenario 19: Fully Valid 700+ Word Publication Qualification ---');
  {
    const validStory = makeStoryWithWords(750);
    const validHash = PublicationGateService.computeContentHash(validStory);

    const res = gate.evaluate({
      story: validStory,
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid', contentHash: validHash } as any),
      extraction: makePublishingExtraction({}),
    });

    assert(res.decision === 'PUBLISH', 'Scenario 19a: Fully valid 750-word story qualifies for PUBLISH');
    assert(res.reason === 'AUTO_PUBLISH_VALID_CREATE', 'Scenario 19b: Reason is AUTO_PUBLISH_VALID_CREATE');
    assert(res.contentHash === validHash, 'Scenario 19c: Result content hash matches canonical hash');
  }

  // ----------------------------------------------------
  // SCENARIO 20: An otherwise valid 500-word article is held by publication gate
  // ----------------------------------------------------
  console.log('\n--- Scenario 20: Otherwise Valid 500-Word Article Blocked ---');
  {
    const story500 = makeStoryWithWords(500);
    const actualWords = countArticleBodyWords(story500.content);
    assert(actualWords === 500, 'Scenario 20a: Story has exactly 500 words', `Found: ${actualWords}`);

    const res500 = gate.evaluate({
      story: story500,
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    });

    assert(res500.decision === 'HOLD', 'Scenario 20b: Otherwise valid 500-word article is held');
    assert(res500.reason === 'INSUFFICIENT_ARTICLE_LENGTH', 'Scenario 20c: Reason is INSUFFICIENT_ARTICLE_LENGTH');
    assert(
      res500.blockingIssues[0].includes('500 words, which is below the 700-word minimum policy'),
      'Scenario 20d: Descriptive message confirms 500 words vs 700-word minimum policy'
    );
  }

  console.log('\n====================================================');
  console.log(`700-WORD MINIMUM POLICY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log('ALL 20 VERIFICATION SCENARIOS SUCCESSFULLY VALIDATED');
  console.log('====================================================\n');
}

runPolicyTestSuite().catch((err) => {
  console.error('\n❌ Test Suite Aborted with Error:', err);
  process.exit(1);
});
