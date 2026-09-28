/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
    this.baseUrl = (options.baseUrl || 'https://the-meridian.news').replace(/\/+$/, '');
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
          url: candidate.heroImage || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=1200',
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

      if (!options.dryRun) {
        await this.repository.createStory(
          newStory,
          cluster.id,
          candidate.facts,
          candidate.sources
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
