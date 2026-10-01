/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

export const CategoryEnum = z.enum([
  'ai',
  'technology',
  'gaming',
  'science',
  'space',
  'business',
  'world',
  'entertainment',
  'cybersecurity',
  'apps',
  'hardware',
]);

export const StoryStatusEnum = z.enum([
  'normal',
  'developing',
  'announcement',
  'updated',
  'analysis',
  'review',
  'breaking',
]);

export const ConfidenceLevelEnum = z.enum([
  'exact',
  'high',
  'medium',
  'low',
  'missing',
  'conflicted',
]);

export const EntityTypeEnum = z.enum([
  'person',
  'company',
  'organization',
  'product',
  'game',
  'technology',
  'location',
  'event',
]);

export const ExtractedEntitySchema = z.object({
  name: z.string().min(1).max(255),
  type: EntityTypeEnum,
  relevance: z.number().min(0).max(1).default(0.8),
});

export const ExtractedFactSchema = z.object({
  label: z.string().min(1).max(128),
  value: z.string().min(1).max(500),
  evidence: z.string().min(1),
  confidence: z.number().min(0).max(1).default(0.9),
});

export const ExtractedTimelineCandidateSchema = z.object({
  date: z.string().min(1).max(64),
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(1000),
});

export const SourceEvidenceItemSchema = z.object({
  claim: z.string().default(''),
  evidenceText: z.string().default(''),
  sourceUrl: z.string().default(''),
  confidence: z.number().min(0).max(1).default(0.9),
});

export const ContentBlockSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['paragraph', 'heading', 'list', 'quote', 'callout', 'image', 'video']),
  content: z.string().min(1),
  level: z.number().optional(),
  caption: z.string().optional(),
  author: z.string().optional(),
  variant: z.enum(['info', 'warning', 'insight', 'update']).optional(),
  items: z.array(z.string()).optional(),
});

/**
 * Zod validation schema for the LLM extraction payload
 */
export const ExtractedPayloadSchema = z.object({
  title: z.string().min(5).max(300),
  dek: z.string().max(400).default(''),
  summary: z.string().min(20).max(2000),
  summaryPoints: z.array(z.string().min(5)).min(2).max(8),

  category: CategoryEnum,
  subcategory: z.string().min(1).max(64),
  classificationConfidence: z.number().min(0).max(1).default(0.9),
  topics: z.array(z.string()).default([]),

  status: StoryStatusEnum.default('normal'),
  eventDate: z.string().nullable().optional(),
  author: z.string().nullable().optional(),

  entities: z.array(ExtractedEntitySchema).default([]),
  facts: z.array(ExtractedFactSchema).default([]),
  timelineCandidates: z.array(ExtractedTimelineCandidateSchema).default([]),

  contentBlocks: z.array(ContentBlockSchema).min(1),

  heroImage: z.string().nullable().optional(),
  sourceEvidence: z.array(SourceEvidenceItemSchema).default([]),

  overallConfidence: z.number().min(0).max(1).default(0.85),
  confidenceLevel: ConfidenceLevelEnum.default('high'),
  hasConflicts: z.boolean().default(false),
  conflictDetails: z.string().nullable().optional(),
});

export type ExtractedPayload = z.infer<typeof ExtractedPayloadSchema>;
