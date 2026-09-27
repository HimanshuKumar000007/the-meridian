/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ExtractedNewsCandidate } from '../../../src/types/extraction';
import type { NewsValidationResult } from '../../../src/types/validation';
import type { LifecycleAction } from '../../../src/types/lifecycle';
import type { Story } from '../../../src/types/story';

export interface LifecycleFixtureCase {
  id: string;
  name: string;
  description: string;
  candidate: ExtractedNewsCandidate;
  validation: NewsValidationResult;
  existingStories?: Story[];
  expectedAction: LifecycleAction;
  expectedMatchReason?: string;
}

export function makeTestCandidate(partial: Partial<ExtractedNewsCandidate>): ExtractedNewsCandidate {
  return {
    id: partial.id || `ext_${Math.random().toString(36).substring(2, 9)}`,
    discoveryItemId: partial.discoveryItemId || 'disc_default',
    title: partial.title || 'Default Title',
    dek: partial.dek || 'Default Dek',
    summary: partial.summary || 'Default Summary',
    summaryPoints: partial.summaryPoints || ['Default point 1'],
    category: partial.category || 'tech',
    subcategory: partial.subcategory || 'computing',
    classificationConfidence: 0.95,
    topics: ['technology'],
    status: 'normal',
    publishedAt: partial.publishedAt || '2026-09-26T10:00:00Z',
    eventDate: partial.eventDate || null,
    author: 'Editorial Desk',
    entities: partial.entities || [],
    facts: partial.facts || [],
    timelineCandidates: [],
    contentBlocks: partial.contentBlocks || [
      { type: 'paragraph', text: partial.summary || 'Article body paragraph.' },
    ],
    sources: partial.sources || [{ name: 'Reuters', url: 'https://reuters.com/tech/default' }],
    heroImage: 'https://images.unsplash.com/photo-tech',
    sourceEvidence: [],
    overallConfidence: 0.95,
    confidenceLevel: 'high',
    hasConflicts: false,
    extractionStatus: 'completed',
    model: 'meta/llama-3.3-70b-instruct',
    promptVersion: 'v1.0.0-nv-extraction',
    inputHash: 'input_hash_val',
    outputHash: 'output_hash_val',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function makeTestValidation(partial: Partial<NewsValidationResult>): NewsValidationResult {
  return {
    id: partial.id || `val_${Math.random().toString(36).substring(2, 9)}`,
    extractionId: partial.extractionId || 'ext_default',
    status: partial.status || 'valid',
    overallScore: partial.overallScore ?? 0.95,
    issues: partial.issues || [],
    validatedFields: partial.validatedFields || { title: 'validated', summary: 'validated' },
    rejectedFields: partial.rejectedFields || [],
    claimCoverage: partial.claimCoverage ?? 0.9,
    sourceCoverage: partial.sourceCoverage ?? 0.8,
    categoryValidation: {
      expectedCategory: 'tech',
      extractedCategory: 'tech',
      status: 'match',
      confidence: 0.95,
    },
    dateValidation: { status: 'valid' },
    numberValidation: { numbersChecked: 1, numbersPassed: 1, status: 'valid' },
    quoteValidation: { quotesChecked: 0, quotesPassed: 0, status: 'no_quotes' },
    entityValidation: { entitiesChecked: 1, entitiesPassed: 1, status: 'valid' },
    originalityCheck: { copyRiskScore: 0.1, status: 'original' },
    sensitiveTopicFlags: partial.sensitiveTopicFlags || [],
    validatorVersion: 'v1.0.0-independent-quality-gate',
    inputHash: 'val_hash_default',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const LIFECYCLE_FIXTURES: LifecycleFixtureCase[] = [
  // 1. Brand-New AI Story -> CREATE
  {
    id: 'case_01_brand_new_ai',
    name: 'Brand-New AI Story',
    description: 'Completely novel AI breakthrough with no existing story in database.',
    candidate: makeTestCandidate({
      id: 'ext_ai_01',
      title: 'DeepMind Releases Multimodal Reasoning Agent Gemini Alpha 3',
      summary: 'Google DeepMind announced Gemini Alpha 3 with autonomous agentic planning capabilities.',
      category: 'ai',
      entities: [{ name: 'Google DeepMind', type: 'company', relevance: 0.98 }],
      facts: [{ label: 'Parameters', value: '180B', evidence: '', confidence: 0.99 }],
      sources: [{ name: 'DeepMind Blog', url: 'https://deepmind.google/discover/gemini-alpha-3' }],
    }),
    validation: makeTestValidation({ extractionId: 'ext_ai_01', status: 'valid' }),
    expectedAction: 'CREATE',
  },

  // 2. Brand-New Gaming Story -> CREATE
  {
    id: 'case_02_brand_new_gaming',
    name: 'Brand-New Gaming Story',
    description: 'New gaming title announcement with no matching cluster.',
    candidate: makeTestCandidate({
      id: 'ext_game_01',
      title: 'Valve Unveils Half-Life Citadel for Next-Gen SteamVR Headsets',
      summary: 'Valve Corporation officially revealed Half-Life Citadel with real-time physics simulation.',
      category: 'gaming',
      entities: [{ name: 'Valve', type: 'company', relevance: 0.95 }],
      sources: [{ name: 'Steam News', url: 'https://store.steampowered.com/news/half-life-citadel' }],
    }),
    validation: makeTestValidation({ extractionId: 'ext_game_01', status: 'valid' }),
    expectedAction: 'CREATE',
  },

  // 3. Duplicate Same Source -> NO_OP
  {
    id: 'case_03_duplicate_same_source',
    name: 'Duplicate Same Source',
    description: 'Same canonical source URL reported again with identical content.',
    candidate: makeTestCandidate({
      id: 'ext_dup_01',
      title: 'DeepMind Releases Multimodal Reasoning Agent Gemini Alpha 3',
      summary: 'Google DeepMind announced Gemini Alpha 3 with autonomous agentic planning capabilities.',
      category: 'ai',
      sources: [{ name: 'DeepMind Blog', url: 'https://deepmind.google/discover/gemini-alpha-3' }],
    }),
    validation: makeTestValidation({ extractionId: 'ext_dup_01', status: 'valid' }),
    expectedAction: 'NO_OP',
    expectedMatchReason: 'MATCH_CANONICAL_URL',
  },

  // 4. Same Event Different Publisher -> NO_OP
  {
    id: 'case_04_same_event_diff_publisher',
    name: 'Same Event from Second Publisher',
    description: 'The Verge reports the same DeepMind announcement without new facts.',
    candidate: makeTestCandidate({
      id: 'ext_pub_02',
      title: 'Google DeepMind Launches Gemini Alpha 3 Multimodal AI Model',
      summary: 'DeepMind officially announced Gemini Alpha 3 with autonomous planning.',
      category: 'ai',
      entities: [{ name: 'Google DeepMind', type: 'company', relevance: 0.98 }],
      sources: [{ name: 'The Verge', url: 'https://theverge.com/ai/gemini-alpha-3-launch' }],
    }),
    validation: makeTestValidation({ extractionId: 'ext_pub_02', status: 'valid' }),
    expectedAction: 'NO_OP',
  },

  // 5. Same Event with New Fact -> UPDATE
  {
    id: 'case_05_same_event_new_fact',
    name: 'Same Event with New Verified Fact',
    description: 'Source confirms release pricing and open weights availability.',
    candidate: makeTestCandidate({
      id: 'ext_fact_01',
      title: 'Google DeepMind Confirms Open Weights for Gemini Alpha 3',
      summary: 'Google DeepMind released Gemini Alpha 3 and confirmed model weights will be available under Apache 2.0.',
      category: 'ai',
      entities: [{ name: 'Google DeepMind', type: 'company', relevance: 0.98 }],
      facts: [
        { label: 'License', value: 'Apache 2.0', evidence: '', confidence: 0.99 },
        { label: 'Release Pricing', value: 'Free for Academic Research', evidence: '', confidence: 0.95 },
      ],
      sources: [{ name: 'VentureBeat', url: 'https://venturebeat.com/ai/gemini-alpha-open-weights' }],
    }),
    validation: makeTestValidation({ extractionId: 'ext_fact_01', status: 'valid' }),
    expectedAction: 'UPDATE',
  },

  // 6. Same Event with New Date -> UPDATE
  {
    id: 'case_06_same_event_new_date',
    name: 'Same Event with New Scheduled Date',
    description: 'Confirmed public beta date announced for Gemini Alpha 3.',
    candidate: makeTestCandidate({
      id: 'ext_date_01',
      title: 'Google DeepMind Sets Gemini Alpha 3 Public Beta for October 15',
      summary: 'DeepMind confirmed the public beta rollout date for Gemini Alpha 3.',
      category: 'ai',
      eventDate: '2026-10-15T00:00:00Z',
      entities: [{ name: 'Google DeepMind', type: 'company', relevance: 0.98 }],
      sources: [{ name: 'TechCrunch', url: 'https://techcrunch.com/gemini-alpha-beta-date' }],
    }),
    validation: makeTestValidation({ extractionId: 'ext_date_01', status: 'valid' }),
    expectedAction: 'UPDATE',
  },

  // 7. Same Event New Source Only -> NO_OP (with source attached)
  {
    id: 'case_07_new_source_only',
    name: 'Same Event New Source Only',
    description: 'Reuters confirms the exact same event details with no new facts.',
    candidate: makeTestCandidate({
      id: 'ext_src_01',
      title: 'Google DeepMind Launches Gemini Alpha 3',
      summary: 'DeepMind officially announced Gemini Alpha 3 with autonomous planning.',
      category: 'ai',
      entities: [{ name: 'Google DeepMind', type: 'company', relevance: 0.98 }],
      sources: [{ name: 'Reuters', url: 'https://reuters.com/technology/gemini-alpha-launch' }],
    }),
    validation: makeTestValidation({ extractionId: 'ext_src_01', status: 'valid' }),
    expectedAction: 'NO_OP',
  },

  // 8. Same Company Different Event -> CREATE (NEVER OVER-MERGE)
  {
    id: 'case_08_same_company_diff_event',
    name: 'Same Company Different Event',
    description: 'DeepMind reports quarterly operating numbers, NOT a model launch.',
    candidate: makeTestCandidate({
      id: 'ext_diff_01',
      title: 'Google DeepMind Reports Record Third Quarter Infrastructure Investments',
      summary: 'Alphabet reported DeepMind cloud datacenter spending reached $4.2 billion this quarter.',
      category: 'business',
      entities: [{ name: 'Google DeepMind', type: 'company', relevance: 0.98 }],
      facts: [{ label: 'Quarterly Investment', value: '$4.2 billion', evidence: '', confidence: 0.97 }],
      sources: [{ name: 'Bloomberg', url: 'https://bloomberg.com/deepmind-q3-datacenter' }],
    }),
    validation: makeTestValidation({ extractionId: 'ext_diff_01', status: 'valid' }),
    expectedAction: 'CREATE',
  },

  // 9. Same Person Unrelated Story -> CREATE
  {
    id: 'case_09_same_person_unrelated',
    name: 'Same Person Unrelated Story',
    description: 'Demis Hassabis keynote at Cambridge University on AI ethics.',
    candidate: makeTestCandidate({
      id: 'ext_person_01',
      title: 'Demis Hassabis Delivers Cambridge Keynote on Artificial Intelligence Ethics',
      summary: 'Demis Hassabis addressed students at Cambridge University regarding long-term artificial intelligence safety.',
      category: 'world',
      entities: [{ name: 'Demis Hassabis', type: 'person', relevance: 0.95 }],
      sources: [{ name: 'BBC', url: 'https://bbc.com/news/education-hassabis-keynote' }],
    }),
    validation: makeTestValidation({ extractionId: 'ext_person_01', status: 'valid' }),
    expectedAction: 'CREATE',
  },

  // 10. Needs Review Candidate -> HOLD
  {
    id: 'case_10_needs_review_hold',
    name: 'Needs Review Gate Hold',
    description: 'Candidate flagged with sensitive topics held for human editorial review.',
    candidate: makeTestCandidate({
      id: 'ext_hold_01',
      title: 'Frontline Strike Reports Border Casualties and Fatalities',
      summary: 'Regional defense ministry confirmed 12 casualties following shelling.',
      category: 'world',
      sources: [{ name: 'AP News', url: 'https://apnews.com/world/border-strike' }],
    }),
    validation: makeTestValidation({
      extractionId: 'ext_hold_01',
      status: 'needs_review',
      overallScore: 0.75,
      sensitiveTopicFlags: ['war_casualties'],
    }),
    expectedAction: 'HOLD',
  },

  // 11. Rejected Candidate -> REJECT
  {
    id: 'case_11_rejected_candidate',
    name: 'Rejected Candidate Gate',
    description: 'Candidate with fabricated quote rejected from story creation.',
    candidate: makeTestCandidate({
      id: 'ext_rej_01',
      title: 'Tech CEO Announces Complete Workforce Automation',
      summary: 'CEO purportedly claimed all engineers will be fired next week.',
      category: 'tech',
      sources: [{ name: 'Blog', url: 'https://unverified.com/claim' }],
    }),
    validation: makeTestValidation({
      extractionId: 'ext_rej_01',
      status: 'rejected',
      overallScore: 0.3,
    }),
    expectedAction: 'REJECT',
  },

  // 12. Insufficient Evidence Candidate -> REJECT
  {
    id: 'case_12_insufficient_evidence',
    name: 'Insufficient Evidence Gate',
    description: 'Source text too short to verify, rejected by validation gate.',
    candidate: makeTestCandidate({
      id: 'ext_insuff_01',
      title: 'Subscription Paywalled Snippet',
      summary: 'Paywalled snippet without verifiable article body.',
      category: 'tech',
      sources: [{ name: 'Paywall', url: 'https://paywalled.com/snippet' }],
    }),
    validation: makeTestValidation({
      extractionId: 'ext_insuff_01',
      status: 'insufficient_evidence',
      overallScore: 0.0,
    }),
    expectedAction: 'REJECT',
  },

  // 13. Idempotent Duplicate Processing -> NO_OP / Identical Decision
  {
    id: 'case_13_idempotent_processing',
    name: 'Idempotent Re-execution',
    description: 'Reprocessing an already decided extraction returns the exact previous record.',
    candidate: makeTestCandidate({
      id: 'ext_idemp_01',
      title: 'SpaceX Prepares Starship Flight 7 for Launch Window',
      summary: 'SpaceX completed static fire tests ahead of Starship Flight 7.',
      category: 'science',
      sources: [{ name: 'SpaceNews', url: 'https://spacenews.com/starship-flight-7-prep' }],
    }),
    validation: makeTestValidation({ extractionId: 'ext_idemp_01', status: 'valid' }),
    expectedAction: 'CREATE',
  },

  // 14. Title Variation Matching -> NO_OP / Cluster Match
  {
    id: 'case_14_title_variation',
    name: 'Slight Title Variation of Starship Flight 7',
    description: 'Starship Flight 7 Launch Window Set by SpaceX resolves to same event.',
    candidate: makeTestCandidate({
      id: 'ext_var_01',
      title: 'Starship Flight 7 Launch Window Set by SpaceX',
      summary: 'SpaceX completed static fire tests ahead of Starship Flight 7.',
      category: 'science',
      sources: [{ name: 'Ars Technica', url: 'https://arstechnica.com/starship-7-static-fire' }],
    }),
    validation: makeTestValidation({ extractionId: 'ext_var_01', status: 'valid' }),
    expectedAction: 'NO_OP',
  },

  // 15. Tracking URL Stripping -> MATCH_CANONICAL_URL
  {
    id: 'case_15_tracking_url_variation',
    name: 'URL with UTM Tracking Tags',
    description: 'Same canonical URL with marketing parameters resolves to canonical match.',
    candidate: makeTestCandidate({
      id: 'ext_utm_01',
      title: 'SpaceX Prepares Starship Flight 7 for Launch Window',
      summary: 'SpaceX completed static fire tests ahead of Starship Flight 7.',
      category: 'science',
      sources: [{ name: 'SpaceNews', url: 'https://spacenews.com/starship-flight-7-prep?utm_source=twitter&utm_medium=social' }],
    }),
    validation: makeTestValidation({ extractionId: 'ext_utm_01', status: 'valid' }),
    expectedAction: 'NO_OP',
    expectedMatchReason: 'MATCH_CANONICAL_URL',
  },

  // 16. Conflicting Numbers Gate -> HOLD
  {
    id: 'case_16_conflicting_numbers',
    name: 'Conflicting Financial Metric',
    description: 'Candidate provides conflicting revenue numbers, held for review.',
    candidate: makeTestCandidate({
      id: 'ext_conf_01',
      title: 'Contradictory Valuation Numbers on Fusion Energy Round',
      summary: 'Startup claimed $10 billion valuation despite previous filings stating $2 billion.',
      category: 'tech',
      sources: [{ name: 'Unknown', url: 'https://techblog.com/fusion-conflicting-numbers' }],
    }),
    validation: makeTestValidation({
      extractionId: 'ext_conf_01',
      status: 'needs_review',
      overallScore: 0.65,
    }),
    expectedAction: 'HOLD',
  },

  // 17. Brand-New Climate Story -> CREATE
  {
    id: 'case_17_brand_new_climate',
    name: 'Brand-New Climate Story',
    description: 'International Antarctic ice sheet satellite monitoring study.',
    candidate: makeTestCandidate({
      id: 'ext_clim_01',
      title: 'ESA CryoSat-2 Reveals Antarctic Ice Shelf Mass Equilibrium Study',
      summary: 'European Space Agency satellite altimetry measurements evaluate glacial stability.',
      category: 'science',
      entities: [{ name: 'European Space Agency', type: 'organization', relevance: 0.95 }],
      sources: [{ name: 'ESA Earth', url: 'https://esa.int/cryosat-antarctic-equilibrium' }],
    }),
    validation: makeTestValidation({ extractionId: 'ext_clim_01', status: 'valid' }),
    expectedAction: 'CREATE',
  },

  // 18. Brand-New World Diplomacy Story -> CREATE
  {
    id: 'case_18_brand_new_world',
    name: 'Brand-New World Story',
    description: 'ASEAN summit multilateral agreement on maritime boundary navigation.',
    candidate: makeTestCandidate({
      id: 'ext_world_01',
      title: 'ASEAN Leaders Ratify Framework for Maritime Navigation Protocols',
      summary: 'Southeast Asian leaders signed a joint treaty standardizing communication channels.',
      category: 'world',
      entities: [{ name: 'ASEAN', type: 'organization', relevance: 0.95 }],
      sources: [{ name: 'CNA', url: 'https://channelnewsasia.com/asean-maritime-ratification' }],
    }),
    validation: makeTestValidation({ extractionId: 'ext_world_01', status: 'valid' }),
    expectedAction: 'CREATE',
  },

  // 19. Meaningful Update to Existing Story -> UPDATE
  {
    id: 'case_19_meaningful_update_asean',
    name: 'Meaningful Update to ASEAN Story',
    description: 'Signatories confirm official ratification schedule across member states.',
    candidate: makeTestCandidate({
      id: 'ext_world_upd_01',
      title: 'ASEAN Maritime Framework Ratification Timeline Established for January',
      summary: 'ASEAN member nations confirmed the formal maritime treaty will enter full legal force in January.',
      category: 'world',
      entities: [{ name: 'ASEAN', type: 'organization', relevance: 0.95 }],
      facts: [{ label: 'Effective Date', value: 'January 1, 2027', evidence: '', confidence: 0.98 }],
      sources: [{ name: 'Reuters Asia', url: 'https://reuters.com/world/asia-pacific/asean-treaty-date' }],
    }),
    validation: makeTestValidation({ extractionId: 'ext_world_upd_01', status: 'valid' }),
    expectedAction: 'UPDATE',
  },

  // 20. Concurrent Simulation Candidate -> NO_OP
  {
    id: 'case_20_concurrent_followup',
    name: 'Concurrent Followup Candidate',
    description: 'Parallel report of ASEAN ratification without additional facts resolves to NO_OP.',
    candidate: makeTestCandidate({
      id: 'ext_world_dup_02',
      title: 'ASEAN Leaders Ratify Framework for Maritime Navigation Protocols',
      summary: 'Southeast Asian leaders signed a joint treaty standardizing communication channels.',
      category: 'world',
      entities: [{ name: 'ASEAN', type: 'organization', relevance: 0.95 }],
      sources: [{ name: 'Straits Times', url: 'https://straitstimes.com/asean-maritime-framework' }],
    }),
    validation: makeTestValidation({ extractionId: 'ext_world_dup_02', status: 'valid' }),
    expectedAction: 'NO_OP',
  },
];
