/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ExtractedNewsCandidate } from '../../../src/types/extraction';
import type { NewsValidationResult } from '../../../src/types/validation';
import type { StoryLifecycleDecision } from '../../../src/types/lifecycle';
import type { Story } from '../../../src/types/story';
import type {
  PublicationDecisionType,
  PublicationGateInput,
} from '../../../src/types/publishing';

export interface PublishingFixtureCase {
  id: string;
  name: string;
  description: string;
  input: PublicationGateInput;
  expectedDecision: PublicationDecisionType;
  expectedReasonSubstr?: string;
  force?: boolean;
  scheduledFor?: string;
  setupFn?: (repo: any, engine: any) => Promise<void> | void;
}

export function makePublishingStory(partial: Partial<Story>): Story {
  return {
    id: partial.id || `story-${Math.random().toString(36).substring(2, 8)}`,
    slug: partial.slug !== undefined ? partial.slug : 'sample-validated-story-slug',
    title:
      partial.title !== undefined
        ? partial.title
        : 'European Space Agency Successfully Launches Clean Energy Satellite',
    summary:
      partial.summary !== undefined
        ? partial.summary
        : 'The European Space Agency launched its advanced orbital reflector into sun-synchronous orbit from French Guiana.',
    category: partial.category !== undefined ? partial.category : 'space',
    status: partial.status || 'draft',
    lifecycleStatus: partial.lifecycleStatus || 'draft',
    published_version: partial.published_version || 1,
    publishedVersion: partial.publishedVersion || 1,
    author: partial.author || {
      id: 'auth-meridian-desk',
      name: 'The Meridian Editorial Staff',
      role: 'Staff Reporter',
    },
    image: partial.image ?? 'https://images.unsplash.com/photo-space-reflector-clean',
    content: partial.content || [
      {
        type: 'paragraph',
        text: 'The European Space Agency has confirmed the successful orbital deployment of its advanced clean energy satellite today from the Kourou Space Centre in French Guiana.',
      },
      {
        type: 'paragraph',
        text: 'The solar collection platform will monitor clean energy distribution patterns across polar regions and beam atmospheric density data back to ground stations.',
      },
    ],
    sources: partial.sources || [
      {
        name: 'ESA Official Press Office',
        url: 'https://esa.int/news/2026/clean-energy-launch',
        isPrimary: true,
      },
    ],
    facts: partial.facts || [
      { label: 'Launch Vehicle', value: 'Ariane 6' },
      { label: 'Orbit Altitude', value: '720 km' },
    ],
    publishedAt: partial.publishedAt || new Date().toISOString(),
    published_at: partial.published_at || new Date().toISOString(),
    timeDisplay: 'Just now',
    readTime: '3 min read',
  };
}

export function makePublishingLifecycleDecision(
  partial: Partial<StoryLifecycleDecision>
): StoryLifecycleDecision {
  return {
    id: partial.id || `lifedec_${Math.random().toString(36).substring(2, 8)}`,
    action: partial.action || 'CREATE',
    storyId: partial.storyId || null,
    clusterId: partial.clusterId || 'cluster_sample',
    matchConfidence: partial.matchConfidence || 'none',
    matchReason: partial.matchReason || 'NO_MATCH',
    reason: partial.reason || 'New validated event created as draft story.',
    changedFields: partial.changedFields || [],
    extractionId: partial.extractionId || 'ext_sample',
    validationId: partial.validationId || 'val_sample',
    lifecycleVersion: '1.0.0',
    createdAt: new Date().toISOString(),
  };
}

export function makePublishingValidation(
  partial: Partial<NewsValidationResult>
): NewsValidationResult {
  return {
    id: partial.id || `val_${Math.random().toString(36).substring(2, 8)}`,
    extractionId: partial.extractionId || 'ext_sample',
    status: partial.status || 'valid',
    overallScore: partial.overallScore ?? 0.94,
    issues: partial.issues || [],
    validatedFields: partial.validatedFields || {
      title: 'validated',
      summary: 'validated',
      category: 'validated',
      facts: 'validated',
    },
    rejectedFields: partial.rejectedFields || [],
    claimCoverage: partial.claimCoverage ?? 1.0,
    sourceCoverage: partial.sourceCoverage ?? 1.0,
    categoryValidation: partial.categoryValidation || {
      expectedCategory: 'space',
      extractedCategory: 'space',
      status: 'match',
      confidence: 1.0,
    },
    dateValidation: partial.dateValidation || { status: 'valid' },
    numberValidation: partial.numberValidation || {
      numbersChecked: 2,
      numbersPassed: 2,
      status: 'valid',
    },
    quoteValidation: partial.quoteValidation || {
      quotesChecked: 0,
      quotesPassed: 0,
      status: 'valid',
    },
    entityValidation: partial.entityValidation || {
      entitiesChecked: 1,
      entitiesPassed: 1,
      status: 'valid',
    },
    originalityCheck: partial.originalityCheck || {
      copyRiskScore: 0.1,
      status: 'original',
    },
    sensitiveTopicFlags: partial.sensitiveTopicFlags || [],
    validatorVersion: '1.0.0',
    inputHash: 'hash_test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function makePublishingExtraction(
  partial: Partial<ExtractedNewsCandidate>
): ExtractedNewsCandidate {
  return {
    id: partial.id || `ext_${Math.random().toString(36).substring(2, 8)}`,
    discoveryItemId: 'disc_sample',
    title: partial.title || 'European Space Agency Successfully Launches Clean Energy Satellite',
    dek: partial.dek || 'Clean energy reflector deployed to orbit',
    summary:
      partial.summary ||
      'The European Space Agency launched its advanced orbital reflector into sun-synchronous orbit.',
    summaryPoints: partial.summaryPoints || ['Orbital reflector launched'],
    category: partial.category || 'space',
    subcategory: partial.subcategory || 'clean-tech',
    classificationConfidence: 0.95,
    topics: ['space', 'science'],
    status: 'normal',
    publishedAt: new Date().toISOString(),
    eventDate: partial.eventDate || null,
    author: 'ESA Desk',
    entities: [],
    facts: [],
    timelineCandidates: [],
    contentBlocks: [
      {
        type: 'paragraph',
        text: 'The European Space Agency has confirmed the successful orbital deployment of its advanced clean energy satellite.',
      },
    ],
    sources: partial.sources || [
      {
        name: 'ESA Press',
        url: 'https://esa.int/news/clean-energy',
      },
    ],
    heroImage: partial.heroImage !== undefined ? partial.heroImage : 'https://images.unsplash.com/photo-space-reflector-clean',
    sourceEvidence: [],
    overallConfidence: 0.95,
    confidenceLevel: 'high',
    hasConflicts: false,
    extractionStatus: 'completed',
    model: 'meta/llama-3.3-70b-instruct',
    promptVersion: 'v1.0.0',
    inputHash: 'hash_in',
    outputHash: 'hash_out',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const PUBLISHING_FIXTURES: PublishingFixtureCase[] = [
  // 1. Valid new safe story → PUBLISH
  {
    id: 'case_01_valid_new_safe',
    name: 'Valid New Safe Tech Story',
    description: 'Clean space/tech story passing all validation rules',
    input: {
      story: makePublishingStory({ category: 'space' }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({ category: 'space' }),
    },
    expectedDecision: 'PUBLISH',
    expectedReasonSubstr: 'AUTO_PUBLISH_VALID_CREATE',
  },

  // 2. Valid new story with missing image but acceptable fallback → PUBLISH
  {
    id: 'case_02_missing_image_fallback',
    name: 'Valid Story Without Hero Image',
    description: 'Hero image is undefined, relies on site fallback presentation',
    input: {
      story: makePublishingStory({ image: undefined, heroImage: undefined, category: 'gaming' }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({ category: 'gaming', heroImage: undefined }),
    },
    expectedDecision: 'PUBLISH',
    expectedReasonSubstr: 'AUTO_PUBLISH_VALID_CREATE',
  },

  // 3. Rejected validation → REJECT
  {
    id: 'case_03_rejected_validation',
    name: 'Validation Engine Rejected Candidate',
    description: 'Validation failed with hallucination / unverified claims',
    input: {
      story: makePublishingStory({}),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'REJECT' }),
      validation: makePublishingValidation({
        status: 'rejected',
        issues: [
          {
            code: 'UNSUPPORTED_CLAIM',
            severity: 'critical',
            field: 'claims',
            message: 'Claims unsupported by source',
            createdAt: new Date().toISOString(),
          },
        ],
      }),
      extraction: makePublishingExtraction({}),
    },
    expectedDecision: 'REJECT',
    expectedReasonSubstr: 'VALIDATION_REJECTED',
  },

  // 4. Insufficient evidence → HOLD
  {
    id: 'case_04_insufficient_evidence',
    name: 'Insufficient Source Evidence',
    description: 'Validation flagged source text as too short (<120 chars)',
    input: {
      story: makePublishingStory({}),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'REJECT' }),
      validation: makePublishingValidation({ status: 'insufficient_evidence' }),
      extraction: makePublishingExtraction({}),
    },
    expectedDecision: 'HOLD',
    expectedReasonSubstr: 'LOW_EVIDENCE',
  },

  // 5. Needs review → HOLD
  {
    id: 'case_05_needs_review',
    name: 'Validation Status Needs Review',
    description: 'Ambiguous entity or minor date variance requires editorial signoff',
    input: {
      story: makePublishingStory({}),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'HOLD' }),
      validation: makePublishingValidation({ status: 'needs_review' }),
      extraction: makePublishingExtraction({}),
    },
    expectedDecision: 'HOLD',
    expectedReasonSubstr: 'VALIDATION_REVIEW',
  },

  // 6. Sensitive political story → HOLD
  {
    id: 'case_06_sensitive_political',
    name: 'Sensitive Political Election Story',
    description: 'Political category and election predictions must default to HOLD',
    input: {
      story: makePublishingStory({
        category: 'politics',
        title: 'New Polling Predicts Election Winner in Tight Senate Race',
        summary: 'Recent surveyed numbers indicate a likely winner ahead of upcoming congressional election ballots.',
      }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({ category: 'politics' }),
    },
    expectedDecision: 'HOLD',
    expectedReasonSubstr: 'SENSITIVE_TOPIC',
  },

  // 7. Sensitive health story → HOLD
  {
    id: 'case_07_sensitive_health',
    name: 'Sensitive Health Treatment Story',
    description: 'Medical claim of a miracle cure must default to HOLD',
    input: {
      story: makePublishingStory({
        category: 'health',
        title: 'Experimental Therapy Claims Miracle Cure for Chronic Illness',
        summary: 'Researchers report that a newly discovered clinical diagnosis method cures cancer in preliminary mice trials.',
      }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({ category: 'health' }),
    },
    expectedDecision: 'HOLD',
    expectedReasonSubstr: 'SENSITIVE_TOPIC',
  },

  // 8. Financial-risk story → HOLD
  {
    id: 'case_08_financial_risk',
    name: 'High Risk Financial / Investment Advice',
    description: 'Guaranteed returns or market crash predictions must default to HOLD',
    input: {
      story: makePublishingStory({
        category: 'business',
        title: 'Analysts Guarantee 100x Return on New Autonomous AI Coin',
        summary: 'Financial experts provide investment advice predicting guaranteed returns within 30 days.',
      }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({ category: 'business' }),
    },
    expectedDecision: 'HOLD',
    expectedReasonSubstr: 'SENSITIVE_TOPIC',
  },

  // 9. Missing source → HOLD
  {
    id: 'case_09_missing_source',
    name: 'Story Missing Valid Source',
    description: 'Story has empty sources array and extraction lacks primary source URL',
    input: {
      story: makePublishingStory({ sources: [] }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({ sources: [] }),
      sources: [],
    },
    expectedDecision: 'HOLD',
    expectedReasonSubstr: 'MISSING_SOURCE',
  },

  // 10. Missing title → HOLD
  {
    id: 'case_10_missing_title',
    name: 'Story Missing Substantive Title',
    description: 'Title is empty or too short (<10 chars)',
    input: {
      story: makePublishingStory({ title: 'Short' }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    },
    expectedDecision: 'HOLD',
    expectedReasonSubstr: 'MISSING_REQUIRED_FIELD',
  },

  // 11. Missing category → HOLD
  {
    id: 'case_11_missing_category',
    name: 'Story Missing Category',
    description: 'Category string is blank',
    input: {
      story: makePublishingStory({ category: '' }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({ category: '' }),
    },
    expectedDecision: 'HOLD',
    expectedReasonSubstr: 'MISSING_REQUIRED_FIELD',
  },

  // 12. Malformed content → HOLD
  {
    id: 'case_12_malformed_content',
    name: 'Malformed Article Body Content',
    description: 'Content contains no substantive article blocks',
    input: {
      story: makePublishingStory({ content: [{ type: 'paragraph', text: 'Too short' }] }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    },
    expectedDecision: 'HOLD',
    expectedReasonSubstr: 'MALFORMED_CONTENT',
  },

  // 13. Duplicate publication attempt → NO duplicate
  {
    id: 'case_13_duplicate_publication',
    name: 'Duplicate Publication Idempotency',
    description: 'Re-running publish on already published story returns existing version safely',
    input: {
      story: makePublishingStory({ status: 'published', published_version: 1 }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    },
    expectedDecision: 'PUBLISH',
    expectedReasonSubstr: 'AUTO_PUBLISH_VALID_CREATE',
  },

  // 14. Valid story update → UPDATE + publish
  {
    id: 'case_14_valid_story_update',
    name: 'Valid Story Update with New Facts',
    description: 'Lifecycle action UPDATE with new verified facts publishes updated version',
    input: {
      story: makePublishingStory({ status: 'published', published_version: 1 }),
      lifecycleDecision: makePublishingLifecycleDecision({
        action: 'UPDATE',
        changedFields: ['facts', 'content'],
        reason: 'New verified facts discovered.',
      }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    },
    expectedDecision: 'PUBLISH',
    expectedReasonSubstr: 'AUTO_PUBLISH_VALID_UPDATE',
  },

  // 15. Invalid update → HOLD
  {
    id: 'case_15_invalid_update',
    name: 'Invalid Story Update Blocked',
    description: 'Incoming update fails validation and is held from public release',
    input: {
      story: makePublishingStory({ status: 'published', published_version: 1 }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'HOLD' }),
      validation: makePublishingValidation({ status: 'needs_review' }),
      extraction: makePublishingExtraction({}),
    },
    expectedDecision: 'HOLD',
    expectedReasonSubstr: 'VALIDATION_REVIEW',
  },

  // 16. Scheduled future story → remains queued until time
  {
    id: 'case_16_scheduled_future_story',
    name: 'Scheduled Future Story',
    description: 'Publication date is set in future; remains in HOLD/queued state',
    input: {
      story: makePublishingStory({}),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
      scheduledFor: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    },
    expectedDecision: 'HOLD',
    expectedReasonSubstr: 'SCHEDULED_FUTURE',
  },

  // 17. Kill switch disabled → HOLD
  {
    id: 'case_17_kill_switch_disabled',
    name: 'Global Kill Switch Enforced',
    description: 'When AUTOMATED_PUBLISHING_ENABLED is false, all automated publishes become HOLD',
    input: {
      story: makePublishingStory({}),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    },
    expectedDecision: 'HOLD',
    expectedReasonSubstr: 'KILL_SWITCH_DISABLED',
    setupFn: (_repo, engine) => {
      engine.getPolicyService().setGlobalKillSwitch(false);
    },
  },

  // 18. Category automation disabled → HOLD
  {
    id: 'case_18_category_disabled',
    name: 'Category Level Kill Switch',
    description: 'When gaming category switch is disabled, gaming candidate is held',
    input: {
      story: makePublishingStory({ category: 'gaming' }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({ category: 'gaming' }),
    },
    expectedDecision: 'HOLD',
    expectedReasonSubstr: 'CATEGORY_DISABLED',
    setupFn: (_repo, engine) => {
      engine.getPolicyService().setGlobalKillSwitch(true);
      engine.getPolicyService().setCategorySwitch('gaming', false);
    },
  },

  // 19. Publication failure → retryable failed
  {
    id: 'case_19_transient_failure',
    name: 'Transient Storage Failure Handled',
    description: 'Simulated database exception returns retryable failure state',
    input: {
      story: makePublishingStory({}),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    },
    expectedDecision: 'HOLD',
    expectedReasonSubstr: 'RETRY_AFTER_TRANSIENT_FAILURE',
    setupFn: (repo, engine) => {
      engine.getPolicyService().setGlobalKillSwitch(true);
      engine.getPolicyService().setCategorySwitch('space', true);
      repo.shouldFailNextPublish = true;
    },
  },

  // 20. Unpublish → public visibility removed
  {
    id: 'case_20_unpublish_operation',
    name: 'Controlled Story Unpublish',
    description: 'Story transition from published to archived removing public visibility',
    input: {
      story: makePublishingStory({ status: 'published', published_version: 1 }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    },
    expectedDecision: 'UNPUBLISH',
    expectedReasonSubstr: 'UNPUBLISHED_BY_OPERATOR',
  },

  // 21. Correction workflow → audit preserved
  {
    id: 'case_21_correction_workflow',
    name: 'Editorial Story Correction',
    description: 'Correction text appended without destroying prior audit history',
    input: {
      story: makePublishingStory({ status: 'published', published_version: 1 }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'UPDATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({}),
    },
    expectedDecision: 'PUBLISH',
  },

  // 22. Content hash mismatch → HOLD
  {
    id: 'case_22_content_hash_mismatch',
    name: 'Backlog Age Safety Cutoff',
    description: 'A story candidate older than policy max age (72 hours) is held from auto-release',
    input: {
      story: makePublishingStory({
        published_at: '2026-08-01T00:00:00Z',
        publishedAt: '2026-08-01T00:00:00Z',
      }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({ eventDate: '2026-08-01T00:00:00Z' }),
    },
    expectedDecision: 'HOLD',
    expectedReasonSubstr: 'PUBLICATION_POLICY_BLOCK',
  },

  // 23. Concurrent publication → exactly one successful publication
  {
    id: 'case_23_concurrent_publish',
    name: 'Concurrent Publication Mutex Protection',
    description: 'Two simultaneous publish calls on the same story execute safely with in-flight lock',
    input: {
      story: makePublishingStory({ id: 'story-concurrent-test', category: 'technology' }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({ category: 'technology' }),
    },
    expectedDecision: 'PUBLISH',
  },

  // 24. Duplicate cron invocation → idempotent
  {
    id: 'case_24_duplicate_cron_invocation',
    name: 'Cron Re-entry Idempotency',
    description: 'Repeated runner invocations do not duplicate published records',
    input: {
      story: makePublishingStory({ id: 'story-cron-idempotent', category: 'technology' }),
      lifecycleDecision: makePublishingLifecycleDecision({ action: 'CREATE' }),
      validation: makePublishingValidation({ status: 'valid' }),
      extraction: makePublishingExtraction({ category: 'technology' }),
    },
    expectedDecision: 'PUBLISH',
  },
];
