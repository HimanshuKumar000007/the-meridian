/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Category-based fallback image pool.
 * Each category has 5 unique, freely-licensed Unsplash images.
 * Used when NVIDIA does not return a heroImage for an extraction.
 * Picked deterministically by story shortId so each story gets a consistent image.
 */
const CATEGORY_FALLBACK_IMAGES: Record<string, string[]> = {
  ai: [
    'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1655720828018-edd2daec9349?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1666875753105-c63a6f3bdc86?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1625314887424-9f190599b702?auto=format&fit=crop&q=80&w=1200',
  ],
  technology: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80&w=1200',
  ],
  gaming: [
    'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?auto=format&fit=crop&q=80&w=1200',
  ],
  science: [
    'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1628595351029-c2bf17511435?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1564325724739-bae0bd08762c?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1581093196867-ca8d8d7f5e8f?auto=format&fit=crop&q=80&w=1200',
  ],
  space: [
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1614642264762-d0a3b8bf3700?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1454789548928-9efd52dc4031?auto=format&fit=crop&q=80&w=1200',
  ],
  business: [
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1553484771-371a605b060b?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=1200',
  ],
  world: [
    'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1500835556837-99ac94a94552?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200',
  ],
  entertainment: [
    'https://images.unsplash.com/photo-1603190287605-e6ade32fa852?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=1200',
  ],
  cybersecurity: [
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1563206767-5b18f218e8de?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=1200',
  ],
  apps: [
    'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1533228100845-08145b01de14?auto=format&fit=crop&q=80&w=1200',
  ],
  hardware: [
    'https://images.unsplash.com/photo-1555617981-dac3880eac6e?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1540829917886-91ab031b1764?auto=format&fit=crop&q=80&w=1200',
  ],
};

/**
 * Picks a fallback image for a story deterministically by shortId and category.
 * Different stories in the same category get different images (rotates through pool of 5).
 */
function pickFallbackImage(category: string, shortId: string): string {
  const pool = CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES['world'];
  // Use last char of shortId as numeric seed so different stories pick different images
  const seed = shortId.charCodeAt(shortId.length - 1) % pool.length;
  return pool[seed];
}

import { createHash } from 'crypto';
import type { ExtractedNewsCandidate } from '../../types/extraction';
import type { NewsValidationResult } from '../../types/validation';
import type { Story, StoryUpdate } from '../../types/story';
import type {
  StoryLifecycleDecision,
  LifecycleAction,
  MatchConfidence,
  MatchReason,
  StoryCluster,
} from '../../types/lifecycle';
import type { LifecycleRepository } from '../../data/repositories/LifecycleRepository';
import { StoryClusteringService } from './StoryClusteringService';
import { StoryMatchingEngine } from './StoryMatchingEngine';
import { StoryMergePolicy } from './StoryMergePolicy';
import type { OperatorNotificationService } from '../notification/OperatorNotificationService';

export const CURRENT_LIFECYCLE_VERSION = 'v1.0.0-universal-lifecycle-gate';

export interface ProcessCandidateOptions {
  dryRun?: boolean;
  forceRerun?: boolean;
}

export class StoryLifecycleEngine {
  private repository: LifecycleRepository;
  private clusteringService: StoryClusteringService;
  private matchingEngine: StoryMatchingEngine;
  private mergePolicy: StoryMergePolicy;
  private lifecycleVersion: string;
  private notificationService?: OperatorNotificationService;
  private baseUrl: string;

  private inFlightLocks: Map<string, Promise<void>> = new Map();

  constructor(
    repository: LifecycleRepository,
    options: {
      clusteringService?: StoryClusteringService;
      matchingEngine?: StoryMatchingEngine;
      mergePolicy?: StoryMergePolicy;
      lifecycleVersion?: string;
      notificationService?: OperatorNotificationService;
      baseUrl?: string;
    } = {}
  ) {
    this.repository = repository;
    this.clusteringService = options.clusteringService || new StoryClusteringService();
    this.matchingEngine = options.matchingEngine || new StoryMatchingEngine(this.clusteringService);
    this.mergePolicy = options.mergePolicy || new StoryMergePolicy(this.matchingEngine);
    this.lifecycleVersion = options.lifecycleVersion || CURRENT_LIFECYCLE_VERSION;
    this.notificationService = options.notificationService;
    this.baseUrl = (
      options.baseUrl ||
      (typeof process !== 'undefined' && (process.env.REVIEW_BASE_URL || process.env.REVIEW_NOTIFICATION_BASE_URL || process.env.VITE_SITE_URL)) ||
      'https://themeridian.in'
    ).replace(/\/+$/, '');
  }

  /**
   * Generates a stable URL slug from the title and a short ID
   */
  public generateSlug(title: string, shortId: string): string {
    const clean = (title || 'story')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 60);

    return `${clean}-${shortId.toLowerCase()}`;
  }

  /**
   * Evaluates and routes an extracted, validated candidate through the lifecycle gate
   */
  public async processCandidate(
    candidate: ExtractedNewsCandidate,
    validation: NewsValidationResult,
    options: ProcessCandidateOptions = {}
  ): Promise<StoryLifecycleDecision> {
    const extractionId = candidate.id;
    const validationId = validation.id;
    const now = new Date().toISOString();

    // 1. IDEMPOTENCY CHECK
    if (!options.forceRerun) {
      const existing = await this.repository.findLifecycleEvent(
        extractionId,
        validationId,
        this.lifecycleVersion
      );
      if (existing) {
        return existing;
      }
    }

    // 2. VALIDATION HARD GATE
    if (validation.status === 'rejected') {
      const decision: StoryLifecycleDecision = {
        id: `lc_${createHash('md5').update(`${extractionId}_${validationId}`).digest('hex').substring(0, 16)}`,
        action: 'REJECT',
        storyId: null,
        clusterId: null,
        matchConfidence: 'none',
        matchReason: 'NO_MATCH',
        reason: 'Validation gate rejected candidate (unverified/hallucinated content).',
        changedFields: [],
        extractionId,
        validationId,
        lifecycleVersion: this.lifecycleVersion,
        createdAt: now,
      };

      if (!options.dryRun) {
        await this.repository.saveLifecycleDecision(decision);
      }
      return decision;
    }

    if (validation.status === 'insufficient_evidence') {
      const decision: StoryLifecycleDecision = {
        id: `lc_${createHash('md5').update(`${extractionId}_${validationId}`).digest('hex').substring(0, 16)}`,
        action: 'REJECT',
        storyId: null,
        clusterId: null,
        matchConfidence: 'none',
        matchReason: 'NO_MATCH',
        reason: 'Validation gate rejected candidate (insufficient source evidence < 120 chars).',
        changedFields: [],
        extractionId,
        validationId,
        lifecycleVersion: this.lifecycleVersion,
        createdAt: now,
      };

      if (!options.dryRun) {
        await this.repository.saveLifecycleDecision(decision);
      }
      return decision;
    }

    if (validation.status === 'needs_review') {
      const decision: StoryLifecycleDecision = {
        id: `lc_${createHash('md5').update(`${extractionId}_${validationId}`).digest('hex').substring(0, 16)}`,
        action: 'HOLD',
        storyId: null,
        clusterId: null,
        matchConfidence: 'none',
        matchReason: 'NO_MATCH',
        reason: 'Candidate held for editorial review (sensitive topics / review flags present).',
        changedFields: [],
        extractionId,
        validationId,
        lifecycleVersion: this.lifecycleVersion,
        createdAt: now,
      };

      if (!options.dryRun) {
        await this.repository.saveLifecycleDecision(decision);

        if (this.notificationService) {
          try {
            await this.notificationService.notifyReviewRequired({
              storyId: extractionId,
              headline: candidate.title,
              source: candidate.sources?.[0]?.name || candidate.sources?.[0]?.url || 'unknown',
              reason: decision.reason,
              category: candidate.category,
              reviewUrl: `${this.baseUrl}/review/${validationId}`,
              timestamp: now,
              validationId,
              extractionId,
              validationStatus: validation.status,
              issues: validation.issues,
            });
          } catch (notifErr) {
            console.warn('[StoryLifecycleEngine] Fail-safe caught notification error:', notifErr);
          }
        }
      }
      return decision;
    }

    // 3. CONCURRENCY LOCK FOR EVENT CLUSTER
    const clusterKey = this.clusteringService.generateClusterKey(candidate);

    while (this.inFlightLocks.has(clusterKey)) {
      await this.inFlightLocks.get(clusterKey);
    }

    let releaseLock: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.inFlightLocks.set(clusterKey, lockPromise);

    try {
      return await this.executeRouting(candidate, validation, clusterKey, options);
    } finally {
      this.inFlightLocks.delete(clusterKey);
      releaseLock();
    }
  }

  /**
   * Internal execution of clustering, matching, and routing under lock
   */
  private async executeRouting(
    candidate: ExtractedNewsCandidate,
    validation: NewsValidationResult,
    clusterKey: string,
    options: ProcessCandidateOptions
  ): Promise<StoryLifecycleDecision> {
    const extractionId = candidate.id;
    const validationId = validation.id;
    const now = new Date().toISOString();

    // 3. STORY CLUSTERING & MATCHING (Candidates with validation status 'valid')
    let cluster = await this.repository.findClusterByKey(clusterKey);
    if (!cluster) {
      cluster = this.clusteringService.createCluster(candidate);
      if (!options.dryRun) {
        await this.repository.saveCluster(cluster);
      }
    }

    const existingStories = await this.repository.findExistingStories(candidate.category);
    const matchResult = this.matchingEngine.match(candidate, clusterKey, existingStories);

    // 4. ACTION_CREATE: Brand new story
    if (!matchResult.matchedStory) {
      const shortId = createHash('md5').update(`${candidate.id}_${now}`).digest('hex').substring(0, 8);
      const storyId = `story_${shortId}`;
      const slug = this.generateSlug(candidate.title, shortId);

      const newStory: Story = {
        id: storyId,
        slug,
        title: candidate.title,
        dek: candidate.dek,
        summary: candidate.summary,
        summary_points: candidate.summaryPoints,
        category: candidate.category || 'world',
        author: {
          id: 'auth-meridian-desk',
          name: 'The Meridian Newsroom Desk',
          role: 'Editorial Staff Desk',
        },
        status: 'draft', // STRICT INVARIANT: Always draft on creation, NEVER published automatically
        hero_image: {
          url: candidate.heroImage || pickFallbackImage(candidate.category || 'world', shortId),
          alt: candidate.title,
        },
        content: candidate.contentBlocks || [],
        publishedAt: candidate.publishedAt || now,
        published_at: candidate.publishedAt || now,
        timeDisplay: 'Just now',
        readTime: `${Math.max(2, Math.ceil((candidate.summary.length + 300) / 800))} min read`,
        updated_at: now,
        cluster_id: cluster.id,
        content_version: 1,
        reading_time_minutes: Math.max(2, Math.ceil((candidate.summary.length + 300) / 800)),
      };

      let storySources = candidate.sources && candidate.sources.length > 0 ? candidate.sources : [];
      if (storySources.length === 0 && Array.isArray(candidate.sourceEvidence) && candidate.sourceEvidence.length > 0) {
        const seenUrls = new Set<string>();
        for (const se of candidate.sourceEvidence as any[]) {
          const url = se.url || se.sourceUrl;
          const name = se.source || se.name || candidate.category || 'News Source';
          if (url && /^https?:\/\//i.test(url) && !seenUrls.has(url)) {
            seenUrls.add(url);
            storySources.push({ name, url });
          }
        }
      }

      if (!options.dryRun) {
        await this.repository.createStory(
          newStory,
          cluster.id,
          candidate.facts,
          storySources
        );
      }

      const decision: StoryLifecycleDecision = {
        id: `lc_${createHash('md5').update(`${extractionId}_${validationId}`).digest('hex').substring(0, 16)}`,
        action: 'CREATE',
        storyId,
        clusterId: cluster.id,
        matchConfidence: 'none',
        matchReason: 'NO_MATCH',
        reason: 'New validated event created as draft story.',
        changedFields: ['title', 'summary', 'facts', 'content'],
        extractionId,
        validationId,
        lifecycleVersion: this.lifecycleVersion,
        createdAt: now,
      };

      if (!options.dryRun) {
        await this.repository.saveLifecycleDecision(decision);
      }
      return decision;
    }

    // 5. MATCH FOUND: Check for Meaningful Changes (UPDATE vs NO_OP)
    const existingStory = matchResult.matchedStory;
    const existingFacts = await this.repository.getStoryFacts(existingStory.id);
    const existingSources = await this.repository.getStorySources(existingStory.id);

    const changeAnalysis = this.mergePolicy.evaluateChanges(
      existingStory,
      existingFacts,
      existingSources,
      candidate
    );

    // ACTION_UPDATE
    if (changeAnalysis.isMeaningful) {
      const updateEntry: StoryUpdate = {
        id: `upd_${existingStory.id}_${Date.now()}`,
        timestamp: now,
        title: 'Story Update',
        body: changeAnalysis.reason,
        is_major: changeAnalysis.changedFields.includes('facts'),
      };

      const storyChanges: Partial<Story> = {};
      if (changeAnalysis.changedFields.includes('summary')) {
        storyChanges.summary = candidate.summary;
      }
      if (changeAnalysis.changedFields.includes('facts')) {
        storyChanges.summary_points = [
          ...(existingStory.summary_points || []),
          ...changeAnalysis.newFacts.map((f) => `${f.label}: ${f.value}`),
        ];
      }

      if (!options.dryRun) {
        await this.repository.updateStory(
          existingStory.id,
          storyChanges,
          changeAnalysis.newFacts,
          changeAnalysis.newSources,
          updateEntry
        );
      }

      const decision: StoryLifecycleDecision = {
        id: `lc_${createHash('md5').update(`${extractionId}_${validationId}`).digest('hex').substring(0, 16)}`,
        action: 'UPDATE',
        storyId: existingStory.id,
        clusterId: matchResult.matchedCluster?.id || cluster.id,
        matchConfidence: matchResult.confidence,
        matchReason: matchResult.reason,
        reason: changeAnalysis.reason,
        changedFields: changeAnalysis.changedFields,
        extractionId,
        validationId,
        lifecycleVersion: this.lifecycleVersion,
        createdAt: now,
      };

      if (!options.dryRun) {
        await this.repository.saveLifecycleDecision(decision);
      }
      return decision;
    }

    // ACTION_NO_OP
    // Even if no content change, attach newly verified source if present
    if (changeAnalysis.newSources.length > 0 && !options.dryRun) {
      for (const src of changeAnalysis.newSources) {
        await this.repository.attachSource(existingStory.id, src);
      }
    }

    const decision: StoryLifecycleDecision = {
      id: `lc_${createHash('md5').update(`${extractionId}_${validationId}`).digest('hex').substring(0, 16)}`,
      action: 'NO_OP',
      storyId: existingStory.id,
      clusterId: matchResult.matchedCluster?.id || cluster.id,
      matchConfidence: matchResult.confidence,
      matchReason: matchResult.reason,
      reason: changeAnalysis.reason,
      changedFields: [],
      extractionId,
      validationId,
      lifecycleVersion: this.lifecycleVersion,
      createdAt: now,
    };

    if (!options.dryRun) {
      await this.repository.saveLifecycleDecision(decision);
    }
    return decision;
  }
}
