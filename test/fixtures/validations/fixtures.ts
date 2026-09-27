/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ValidationInput } from '../../../src/services/validation/ValidationEngine';
import type { ExtractedNewsCandidate } from '../../../src/types/extraction';
import type { ValidationStatus } from '../../../src/types/validation';

export interface ValidationFixtureCase {
  id: string;
  name: string;
  description: string;
  input: ValidationInput;
  expectedStatus: ValidationStatus;
  expectedIssues?: string[];
}

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
    model: 'meta/llama-3.3-70b-instruct',
    promptVersion: 'v1.0.0-nv-extraction',
    inputHash: 'hash_input_fixture',
    outputHash: 'hash_output_fixture',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const VALIDATION_FIXTURES: ValidationFixtureCase[] = [
  // 1. Perfectly Supported Tech Breakthrough -> valid
  {
    id: 'case_01_valid_tech',
    name: 'Perfectly Supported Tech Article',
    description: 'All facts, numbers, entities, and quotes align exactly with source.',
    input: {
      sourceUrl: 'https://www.reuters.com/technology/quantum-processor-1000-qubits',
      publishedAt: '2026-09-25T10:00:00Z',
      sourceText: `Researchers at IBM and MIT announced a milestone in quantum computing today. The team achieved a 1000 qubits processor benchmark with a 15% error rate reduction. "This milestone demonstrates tangible progress toward quantum utility," the lead researcher stated at the symposium. Commercial deployment is anticipated across cloud centers next year.`,
      extraction: makeCandidate({
        id: 'ext_case_01',
        title: 'Quantum Computing Consortium Achieves 1000-Qubit Processor Benchmark',
        summary: 'IBM and MIT achieve a major quantum computing milestone with a 1000-qubit processor and 15% error reduction.',
        category: 'tech',
        facts: [
          { label: 'Qubit Count', value: '1000 qubits', evidence: 'achieved a 1000 qubits processor', confidence: 0.98 },
          { label: 'Error Rate Reduction', value: '15%', evidence: '15% error rate reduction', confidence: 0.95 },
        ],
        entities: [
          { name: 'IBM', type: 'company', relevance: 0.95 },
          { name: 'MIT', type: 'organization', relevance: 0.92 },
        ],
        contentBlocks: [
          { type: 'paragraph', text: 'Researchers at IBM and MIT announced a milestone today.' },
          { type: 'quote', quote: 'This milestone demonstrates tangible progress toward quantum utility' },
        ],
      }),
    },
    expectedStatus: 'valid',
  },

  // 2. Perfectly Supported World Diplomacy -> valid
  {
    id: 'case_02_valid_world',
    name: 'Verified World Accord',
    description: 'International agreement with multi-lateral entity verification.',
    input: {
      sourceUrl: 'https://www.ft.com/world/eu-mercosur-trade-pact',
      publishedAt: '2026-09-24T12:00:00Z',
      sourceText: `Diplomats from the European Union and Mercosur have finalized terms for a comprehensive international trade agreement spanning 31 nations. The treaty includes environmental protection clauses and agricultural quotas. European negotiators noted the historic nature of the treaty after two decades of discussions.`,
      extraction: makeCandidate({
        id: 'ext_case_02',
        title: 'European Union and Mercosur Finalize Historic Accord Spanning 31 Nations',
        summary: 'The European Union and Mercosur have concluded terms for a landmark trade pact covering 31 nations.',
        category: 'world',
        facts: [
          { label: 'Participating Nations', value: '31 nations', evidence: 'spanning 31 nations', confidence: 0.96 },
        ],
        entities: [
          { name: 'European Union', type: 'organization', relevance: 0.98 },
          { name: 'Mercosur', type: 'organization', relevance: 0.95 },
        ],
      }),
    },
    expectedStatus: 'valid',
  },

  // 3. Perfectly Supported Business Revenue -> valid
  {
    id: 'case_03_valid_business',
    name: 'Verified Business Earnings',
    description: 'Corporate revenue numbers match source text accurately.',
    input: {
      sourceUrl: 'https://www.bloomberg.com/news/articles/semiconductor-revenue-2026',
      publishedAt: '2026-09-23T14:00:00Z',
      sourceText: `The Semiconductor Industry Association reported that global semiconductor sales reached $580 billion this year, reflecting 12.5% growth driven by enterprise artificial intelligence spending. TSMC and Intel reported full fab utilization throughout the third quarter.`,
      extraction: makeCandidate({
        id: 'ext_case_03',
        title: 'Global Semiconductor Sales Surge to $580 Billion Driven by AI Demand',
        summary: 'Worldwide chip revenue expanded to $580 billion with 12.5% annual growth.',
        category: 'business',
        facts: [
          { label: 'Annual Revenue', value: '$580 billion', evidence: 'reached $580 billion', confidence: 0.97 },
          { label: 'Yearly Growth', value: '12.5%', evidence: '12.5% growth', confidence: 0.94 },
        ],
        entities: [
          { name: 'TSMC', type: 'company', relevance: 0.9 },
        ],
      }),
    },
    expectedStatus: 'valid',
  },

  // 4. Perfectly Supported Science Space Discovery -> valid
  {
    id: 'case_04_valid_science',
    name: 'Verified Space Telescope Discovery',
    description: 'Astronomical distances and NASA observations match source.',
    input: {
      sourceUrl: 'https://www.nature.com/articles/jwst-early-galaxy-cluster',
      publishedAt: '2026-09-22T08:00:00Z',
      sourceText: `Astronomers utilizing the James Webb Space Telescope developed by NASA have discovered a compact galaxy cluster located 13.4 billion light-years from Earth. The observation provides fresh empirical evidence regarding stellar evolution during the cosmic dawn.`,
      extraction: makeCandidate({
        id: 'ext_case_04',
        title: 'James Webb Telescope Unveils Early Galaxy Cluster at Cosmic Dawn',
        summary: 'NASA astronomers discover early galaxies located 13.4 billion light-years away.',
        category: 'science',
        facts: [
          { label: 'Cosmic Distance', value: '13.4 billion light-years', evidence: '13.4 billion light-years', confidence: 0.99 },
        ],
        entities: [
          { name: 'NASA', type: 'organization', relevance: 0.95 },
          { name: 'James Webb', type: 'technology', relevance: 0.92 },
        ],
      }),
    },
    expectedStatus: 'valid',
  },

  // 5. Fabricated Direct Quote -> rejected (QUOTE_UNSUPPORTED)
  {
    id: 'case_05_fabricated_quote',
    name: 'Fabricated Quote Injection',
    description: 'Candidate introduces an inflammatory quote completely absent from the source article.',
    input: {
      sourceUrl: 'https://www.cnbc.com/corporate/tech-firm-quarterly-outlook',
      publishedAt: '2026-09-25T11:00:00Z',
      sourceText: `Apex Technologies conducted its quarterly earnings conference. The CEO discussed supply chain improvements and moderate revenue guidance for next fiscal year, emphasizing balanced investments in robotics.`,
      extraction: makeCandidate({
        id: 'ext_case_05',
        title: 'Apex Technologies Outlines Quarterly Financial Projections',
        summary: 'Apex Technologies discusses operational outlook during corporate earnings call.',
        category: 'business',
        contentBlocks: [
          { type: 'paragraph', text: 'The chief executive made a startling announcement.' },
          { type: 'quote', quote: 'We will replace all our human workforce by next week without exceptions.' },
        ],
      }),
    },
    expectedStatus: 'rejected',
    expectedIssues: ['QUOTE_UNSUPPORTED'],
  },

  // 6. Contradicted Metric / Number Mismatch -> rejected (NUMBER_MISMATCH)
  {
    id: 'case_06_contradicted_number',
    name: 'Hallucinated / Inverted Financial Metric',
    description: 'Candidate claims revenue rose by 85% when source says revenue fell by 12%.',
    input: {
      sourceUrl: 'https://www.wsj.com/business/retail-earnings-slump',
      publishedAt: '2026-09-24T16:00:00Z',
      sourceText: `Major retailer GlobalMart reported a challenging quarter as net profit fell by 12% amid rising store operating costs and conservative consumer spending in apparel divisions.`,
      extraction: makeCandidate({
        id: 'ext_case_06',
        title: 'GlobalMart Reports Massive 85% Profit Surge Across All Segments',
        summary: 'Retailer sees 85% surge in operating profits according to quarterly filings.',
        category: 'business',
        facts: [
          { label: 'Profit Growth', value: '85%', evidence: 'Massive surge', confidence: 0.9 },
        ],
      }),
    },
    expectedStatus: 'rejected',
    expectedIssues: ['NUMBER_MISMATCH'],
  },

  // 7. Hallucinated Large Number ($50 Billion vs $50 Million) -> rejected
  {
    id: 'case_07_hallucinated_number',
    name: 'Order of Magnitude Hallucination',
    description: 'Candidate claims $50 billion funding when source says $50 million.',
    input: {
      sourceUrl: 'https://techcrunch.com/funding/aerospace-startup-round',
      publishedAt: '2026-09-24T10:00:00Z',
      sourceText: `Orbital Dynamics, a satellite propulsion startup, has closed a Series B financing round raising $50 million from venture capital partners to expand manufacturing capacity in Colorado.`,
      extraction: makeCandidate({
        id: 'ext_case_07',
        title: 'Orbital Dynamics Secures $50 Billion Mega-Round for Satellite Fleet',
        summary: 'Startup raises $50 billion to fund manufacturing expansion.',
        category: 'tech',
        facts: [
          { label: 'Funding Secured', value: '$50 billion', evidence: 'closed Series B', confidence: 0.95 },
        ],
      }),
    },
    expectedStatus: 'rejected',
    expectedIssues: ['NUMBER_MISMATCH'],
  },

  // 8. Hallucinated Named Entity -> needs_review / rejected
  {
    id: 'case_08_hallucinated_entity',
    name: 'Hallucinated Named Entity',
    description: 'Entity mentioned in candidate is totally absent from archaeological discovery source.',
    input: {
      sourceUrl: 'https://www.archaeology.org/news/pyramid-chamber-survey',
      publishedAt: '2026-09-21T09:00:00Z',
      sourceText: `Egyptian authorities and Cairo University researchers surveyed a newly identified subterranean corridor near Saqqara. Ground-penetrating radar revealed stone masonry dating back over four thousand years.`,
      extraction: makeCandidate({
        id: 'ext_case_08',
        title: 'Researchers Survey Saqqara Subterranean Chamber',
        summary: 'Archaeologists survey underground masonry corridor near Saqqara.',
        category: 'science',
        entities: [
          { name: 'Cairo University', type: 'organization', relevance: 0.9 },
          { name: 'OpenAI Robotics Lab', type: 'company', relevance: 0.8 },
        ],
      }),
    },
    expectedStatus: 'needs_review',
    expectedIssues: ['ENTITY_UNSUPPORTED'],
  },

  // 9. Category Mismatch (Monetary Policy labeled as Sports) -> rejected
  {
    id: 'case_09_category_mismatch',
    name: 'Severe Category Mismatch',
    description: 'Federal Reserve rate cut tagged under Sports instead of Business.',
    input: {
      sourceUrl: 'https://www.reuters.com/business/fed-rate-decision',
      publishedAt: '2026-09-24T18:00:00Z',
      sourceText: `The Federal Reserve opted to lower benchmark interest rates by 25 basis points today as consumer inflation showed sustained moderation toward the central bank's two percent target. Chairman Jerome Powell addressed journalists during the monetary policy press conference.`,
      extraction: makeCandidate({
        id: 'ext_case_09',
        title: 'Federal Reserve Lowers Interest Rates by 25 Basis Points',
        summary: 'The central bank trims interest rates amid declining inflation trends.',
        category: 'sports',
        facts: [
          { label: 'Rate Reduction', value: '25 basis points', evidence: 'lower benchmark rates', confidence: 0.9 },
        ],
      }),
    },
    expectedStatus: 'needs_review',
    expectedIssues: ['CATEGORY_MISMATCH'],
  },

  // 10. Temporal Conflict / Implausible Future Event Date -> needs_review
  {
    id: 'case_10_temporal_conflict',
    name: 'Unanchored Future Event Date',
    description: 'Event date set to 2045 without predictive roadmap phrasing in source.',
    input: {
      sourceUrl: 'https://www.apnews.com/general/civic-center-renovation',
      publishedAt: '2026-09-20T12:00:00Z',
      sourceText: `City council members approved funding for the downtown civic center renovation yesterday. Construction crews will begin structural upgrades next month.`,
      extraction: makeCandidate({
        id: 'ext_case_10',
        title: 'City Council Approves Civic Center Upgrades',
        summary: 'Municipal authorities approve renovation plan for downtown auditorium.',
        category: 'world',
        eventDate: '2045-11-15T00:00:00Z',
      }),
    },
    expectedStatus: 'needs_review',
    expectedIssues: ['DATE_MISMATCH'],
  },

  // 11. Insufficient Source Text (< 120 chars) -> insufficient_evidence
  {
    id: 'case_11_insufficient_source',
    name: 'Truncated Source Snippet',
    description: 'Source text is a 45-character stub insufficient for fact checking.',
    input: {
      sourceUrl: 'https://www.paywallednews.com/story-123',
      publishedAt: '2026-09-25T14:00:00Z',
      sourceText: 'Please subscribe to read the full story online.',
      extraction: makeCandidate({
        id: 'ext_case_11',
        title: 'Alleged Major Breakthrough in Fusion Energy Storage Systems',
        summary: 'Detailed article about superconducting magnet breakthroughs.',
        category: 'science',
      }),
    },
    expectedStatus: 'insufficient_evidence',
    expectedIssues: ['INSUFFICIENT_EVIDENCE'],
  },

  // 12. Empty Source Text -> insufficient_evidence
  {
    id: 'case_12_empty_source',
    name: 'Zero Length Source Text',
    description: 'Source content could not be acquired and is empty.',
    input: {
      sourceUrl: 'https://www.broken-news-link.com/404',
      publishedAt: '2026-09-25T14:00:00Z',
      sourceText: '',
      extraction: makeCandidate({
        id: 'ext_case_12',
        title: 'Unverified Story with Missing Original Source Text',
        summary: 'Candidate was created without source validation content.',
        category: 'tech',
      }),
    },
    expectedStatus: 'insufficient_evidence',
    expectedIssues: ['INSUFFICIENT_EVIDENCE'],
  },

  // 13. Invalid Malformed Source URL -> rejected (SOURCE_URL_INVALID)
  {
    id: 'case_13_invalid_url',
    name: 'Malformed Source URL',
    description: 'Source URL fails standard URL parsing protocols.',
    input: {
      sourceUrl: 'javascript:alert(1)',
      publishedAt: '2026-09-25T10:00:00Z',
      sourceText: `Researchers in robotics demonstrated bipedal balance algorithms over uneven gravel terrain during an engineering conference in Tokyo.`,
      extraction: makeCandidate({
        id: 'ext_case_13',
        title: 'Engineers Demonstrate Bipedal Robotic Balance Over Uneven Surfaces',
        summary: 'Robotics team showcases dynamic walking stabilization algorithms.',
        category: 'tech',
        sources: [{ name: 'Unknown', url: 'javascript:alert(1)' }],
      }),
    },
    expectedStatus: 'rejected',
    expectedIssues: ['SOURCE_URL_INVALID'],
  },

  // 14. Excessive Verbatim Copy Risk (> 250 contiguous chars) -> needs_review
  {
    id: 'case_14_verbatim_copy',
    name: 'Excessive Verbatim Copying',
    description: 'Candidate copies more than 250 characters verbatim without attribution.',
    input: {
      sourceUrl: 'https://www.reuters.com/tech/telecom-spectrum-auction',
      publishedAt: '2026-09-23T11:00:00Z',
      sourceText: `The Federal Communications Commission concluded its mid-band spectrum auction today, granting preliminary licenses to three telecommunications carriers seeking to expand sixth-generation cellular broadband infrastructure across rural metropolitan boundary corridors in North America.`,
      extraction: makeCandidate({
        id: 'ext_case_14',
        title: 'FCC Concludes Mid-Band Spectrum Auction for Next-Gen Telecom',
        summary: 'The Federal Communications Commission concluded its mid-band spectrum auction today, granting preliminary licenses to three telecommunications carriers seeking to expand sixth-generation cellular broadband infrastructure across rural metropolitan boundary corridors in North America.',
        category: 'tech',
      }),
    },
    expectedStatus: 'needs_review',
    expectedIssues: ['CONTENT_COPY_RISK'],
  },

  // 15. Sensitive Topic: War Casualties / Fatalities -> needs_review
  {
    id: 'case_15_sensitive_casualties',
    name: 'Sensitive Topic - War Casualties',
    description: 'Reports of conflict fatalities require editorial oversight before publication.',
    input: {
      sourceUrl: 'https://www.bbc.com/news/world-border-conflict',
      publishedAt: '2026-09-25T08:00:00Z',
      sourceText: `Local authorities confirmed an artillery barrage struck a border outpost early Friday morning. Officials reported that the death toll reached 14 fatalities with numerous civilian casualties receiving emergency care at regional medical clinics.`,
      extraction: makeCandidate({
        id: 'ext_case_15',
        title: 'Artillery Barrage at Border Leaves 14 Dead and Multiple Casualties',
        summary: 'Border outpost strike results in 14 fatalities and multiple civilian casualties.',
        category: 'world',
        facts: [
          { label: 'Fatalities', value: '14 fatalities', evidence: 'death toll reached 14', confidence: 0.95 },
        ],
      }),
    },
    expectedStatus: 'needs_review',
    expectedIssues: ['SENSITIVE_CLAIM'],
  },

  // 16. Sensitive Topic: Unverified Medical Miracle Claims -> needs_review / rejected
  {
    id: 'case_16_sensitive_medical',
    name: 'Sensitive Topic - Unverified Medical Cure',
    description: 'Unsubstantiated medical cure claim flagged for quality review.',
    input: {
      sourceUrl: 'https://www.health-news-blog.org/cure-discovery',
      publishedAt: '2026-09-24T12:00:00Z',
      sourceText: `An unreviewed clinical preprint claimed an herbal formulation provides a miracle cure for cancer without conventional hospital treatments, though major medical associations cautioned that no peer-reviewed trials exist.`,
      extraction: makeCandidate({
        id: 'ext_case_16',
        title: 'Herbal Compound Purported as Miracle Cure for Cancer in Early Study',
        summary: 'Preprint discusses laboratory evaluation of compound as potential miracle cure for cancer.',
        category: 'health',
      }),
    },
    expectedStatus: 'needs_review',
    expectedIssues: ['SENSITIVE_CLAIM'],
  },

  // 17. Sensitive Topic: Guaranteed Financial Returns -> needs_review / rejected
  {
    id: 'case_17_sensitive_financial',
    name: 'Sensitive Topic - Guaranteed Returns Advice',
    description: 'Promotional language promising guaranteed financial profits.',
    input: {
      sourceUrl: 'https://www.crypto-insider-digest.com/token-opportunity',
      publishedAt: '2026-09-25T14:00:00Z',
      sourceText: `Promoters for a decentralized finance project circulated marketing materials asserting guaranteed returns and advising users to buy now before it skyrockets in secondary markets.`,
      extraction: makeCandidate({
        id: 'ext_case_17',
        title: 'DeFi Project Promoters Assert Guaranteed Returns on New Token',
        summary: 'Promotional campaign claims guaranteed returns and urges investors to buy now before it skyrockets.',
        category: 'business',
      }),
    },
    expectedStatus: 'needs_review',
    expectedIssues: ['SENSITIVE_CLAIM'],
  },

  // 18. Clickbait Sensationalist Headline -> needs_review
  {
    id: 'case_18_clickbait_headline',
    name: 'Clickbait Sensationalist Headline',
    description: 'Candidate headline employs all-caps shouting and sensationalist framing.',
    input: {
      sourceUrl: 'https://www.technewstoday.com/ai-model-weights',
      publishedAt: '2026-09-25T09:00:00Z',
      sourceText: `Software developers released an open-source mathematical framework for quantizing neural network parameters to 4-bit floating point precision on workstation GPUs.`,
      extraction: makeCandidate({
        id: 'ext_case_18',
        title: 'SHOCKING TRUTH ABOUT NEW AI SYSTEM EXPOSED YOU WON\'T BELIEVE!!!',
        summary: 'Developers publish open-source quantization library for local GPU inference.',
        category: 'tech',
      }),
    },
    expectedStatus: 'needs_review',
    expectedIssues: ['CLICKBAIT_HEADLINE'],
  },

  // 19. Borderline Confidence Score -> needs_review
  {
    id: 'case_19_borderline_warnings',
    name: 'Borderline Minor Uncertainties',
    description: 'Multiple minor warnings combine to land overall score in needs_review band (0.60 - 0.79).',
    input: {
      sourceUrl: 'https://www.localnews.org/parks/recreation-initiative',
      publishedAt: '2026-09-22T10:00:00Z',
      sourceText: `Town planners discussed municipal greenway trails during an informal work session. Attendees raised questions about trail maintenance costs in 2035.`,
      extraction: makeCandidate({
        id: 'ext_case_19',
        title: 'Town Planners Review Greenway Trail Proposal for 2035',
        summary: 'Municipal committee explores expansion of community walking corridors.',
        category: 'lifestyle',
        eventDate: '2035-06-01T00:00:00Z',
        entities: [
          { name: 'Unknown Regional Trail Authority', type: 'organization', relevance: 0.5 },
        ],
      }),
    },
    expectedStatus: 'needs_review',
  },

  // 20. Compound Catastrophic Failure -> rejected
  {
    id: 'case_20_compound_failure',
    name: 'Compound Multi-Vector Hallucination',
    description: 'Candidate exhibits fabricated quote, wrong numbers, and incompatible category simultaneously.',
    input: {
      sourceUrl: 'https://www.reuters.com/markets/energy-reserves',
      publishedAt: '2026-09-25T15:00:00Z',
      sourceText: `Natural gas stockpiles in storage reservoirs reached 90% of working capacity ahead of the winter heating season, European energy regulators announced Thursday.`,
      extraction: makeCandidate({
        id: 'ext_case_20',
        title: 'Champions League Final Score and Gas Reserve Collapse',
        summary: 'European gas reserves completely emptied out according to sports commentators.',
        category: 'sports',
        facts: [
          { label: 'Depletion Percentage', value: '99.9%', evidence: 'completely emptied', confidence: 0.99 },
        ],
        contentBlocks: [
          { type: 'quote', quote: 'We scored five goals and will shut down all pipelines by midnight.' },
        ],
        entities: [
          { name: 'Real Madrid F.C.', type: 'organization', relevance: 0.9 },
        ],
      }),
    },
    expectedStatus: 'rejected',
    expectedIssues: ['QUOTE_UNSUPPORTED', 'NUMBER_MISMATCH', 'CATEGORY_MISMATCH'],
  },
];
