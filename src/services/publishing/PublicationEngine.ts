/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Story, StoryUpdate } from '../../types/story';
import type {
  PublicationDecisionResult,
  PublicationEvent,
  PublicationGateInput,
  PublicationQueueItem,
  PublicationRun,
} from '../../types/publishing';
import type { PublicationRepository } from '../../data/repositories/PublicationRepository';
import { PublicationGateService } from './PublicationGateService';
import { PublicationPolicyService } from './PublicationPolicyService';

export interface PublicationEngineOptions {
  repository: PublicationRepository;
  gateService?: PublicationGateService;
  policyService?: PublicationPolicyService;
}

export class PublicationEngine {
  private repository: PublicationRepository;
  private gateService: PublicationGateService;
  private policyService: PublicationPolicyService;

  // In-flight concurrency lock per story ID
  private static inFlightStoryLocks: Map<string, Promise<any>> = new Map();

  constructor(options: PublicationEngineOptions) {
    this.repository = options.repository;
    this.policyService = options.policyService || new PublicationPolicyService();
    this.gateService =
      options.gateService || new PublicationGateService(this.policyService);
  }

  public getPolicyService(): PublicationPolicyService {
    return this.policyService;
  }

  public getGateService(): PublicationGateService {
    return this.gateService;
  }

  /**
   * Process a single publication candidate through the publication gate and apply decisions.
   */
  public async publishCandidate(
    input: PublicationGateInput,
    options: {
      force?: boolean;
      dryRun?: boolean;
      scheduledFor?: string;
    } = {}
  ): Promise<{
    decision: PublicationDecisionResult;
    story?: Story | null;
    event?: PublicationEvent | null;
    isIdempotent?: boolean;
    error?: string;
  }> {
    const storyId = input.story.id;

    // Concurrency Lock: Wait for any existing in-flight operation on this story
    while (PublicationEngine.inFlightStoryLocks.has(storyId)) {
      await PublicationEngine.inFlightStoryLocks.get(storyId);
    }

    let releaseLock: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    PublicationEngine.inFlightStoryLocks.set(storyId, lockPromise);

    try {
      // 1. Evaluate Publication Gate
      const gateDecision = this.gateService.evaluate({
        ...input,
        force: options.force,
        scheduledFor: options.scheduledFor || input.scheduledFor,
      });

      // If dry-run mode, return decision immediately without modifying DB
      if (options.dryRun) {
        return {
          decision: gateDecision,
          story: input.story,
          event: null,
          isIdempotent: false,
        };
      }

      const existingStory = await this.repository.getStoryById(storyId);
      const currentStory = existingStory || input.story;
      const previousStatus = currentStory.status || 'draft';

      // 2. Idempotency Check: If already published at target version, return existing
      if (
        previousStatus === 'published' &&
        currentStory.published_version === gateDecision.publicationVersion &&
        gateDecision.decision === 'PUBLISH' &&
        input.lifecycleDecision.action !== 'UPDATE'
      ) {
        return {
          decision: gateDecision,
          story: currentStory,
          event: null,
          isIdempotent: true,
        };
      }

      const now = new Date().toISOString();
      const eventId = `pube-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // 3. Apply Decision
      if (gateDecision.decision === 'PUBLISH') {
        const isUpdate = input.lifecycleDecision.action === 'UPDATE';
        const newStatus = isUpdate ? 'updated' : 'published';

        const event: PublicationEvent = {
          id: eventId,
          storyId,
          lifecycleEventId: input.lifecycleDecision.id,
          action: 'PUBLISH',
          previousStatus,
          newStatus: 'published',
          publicationVersion: gateDecision.publicationVersion,
          reason: gateDecision.reason,
          blockingIssues: gateDecision.blockingIssues,
          validationId: input.validation.id,
          extractionId: input.extraction.id,
          contentHash: gateDecision.contentHash,
          publishedAt: currentStory.published_at || now,
          createdAt: now,
          metadata: {
            isUpdate,
            publishableFields: gateDecision.publishableFields,
          },
        };

        let updatedStory: Story;
        if (isUpdate) {
          // Prepare timeline updates if facts or new details changed
          const timelineUpdates: StoryUpdate[] = [];
          if (
            input.lifecycleDecision.changedFields &&
            input.lifecycleDecision.changedFields.length > 0
          ) {
            timelineUpdates.push({
              id: `upd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              timestamp: now,
              title: 'Coverage Update',
              body: `Story updated with latest verified reporting (${input.lifecycleDecision.changedFields.join(', ')}).`,
              isMajor: input.lifecycleDecision.changedFields.includes('facts'),
            });
          }

          updatedStory = await this.repository.updatePublishedStory(
            currentStory,
            timelineUpdates,
            gateDecision,
            event
          );
        } else {
          updatedStory = await this.repository.publishStory(
            currentStory,
            gateDecision,
            event
          );
        }

        return {
          decision: gateDecision,
          story: updatedStory,
          event,
          isIdempotent: false,
        };
      }

      // 4. Decision is HOLD or REJECT
      const targetStatus: 'held' | 'draft' =
        gateDecision.decision === 'HOLD' ? 'held' : 'draft';

      const event: PublicationEvent = {
        id: eventId,
        storyId,
        lifecycleEventId: input.lifecycleDecision.id,
        action: gateDecision.decision,
        previousStatus,
        newStatus: targetStatus,
        publicationVersion: gateDecision.publicationVersion,
        reason: gateDecision.reason,
        blockingIssues: gateDecision.blockingIssues,
        validationId: input.validation.id,
        extractionId: input.extraction.id,
        contentHash: gateDecision.contentHash,
        publishedAt: null,
        createdAt: now,
      };

      await this.repository.holdOrRejectStory(storyId, targetStatus, event);

      return {
        decision: gateDecision,
        story: { ...currentStory, status: targetStatus },
        event,
        isIdempotent: false,
      };
    } catch (err: any) {
      console.error(`[PublicationEngine] Error processing story ${storyId}:`, err);
      return {
        decision: {
          decision: 'HOLD',
          reason: 'RETRY_AFTER_TRANSIENT_FAILURE',
          blockingIssues: [err.message || 'Transient error during publication.'],
          publishableFields: [],
          publicationVersion: 1,
        },
        story: null,
        event: null,
        error: err.message,
      };
    } finally {
      PublicationEngine.inFlightStoryLocks.delete(storyId);
      releaseLock();
    }
  }

  /**
   * Controlled unpublish of a public story.
   */
  public async unpublishStory(
    storyId: string,
    reason: string = 'UNPUBLISHED_BY_OPERATOR'
  ): Promise<PublicationEvent> {
    const existingStory = await this.repository.getStoryById(storyId);
    const previousStatus = existingStory?.status || 'published';
    const now = new Date().toISOString();

    const event: PublicationEvent = {
      id: `pube-unpub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      storyId,
      action: 'UNPUBLISH',
      previousStatus,
      newStatus: 'archived',
      publicationVersion: existingStory?.published_version || 1,
      reason,
      blockingIssues: [],
      createdAt: now,
    };

    await this.repository.unpublishStory(storyId, event);
    return event;
  }

  /**
   * Process queued publication items in safe bounded batches.
   */
  public async processQueue(options: {
    limit?: number;
    dryRun?: boolean;
    force?: boolean;
  } = {}): Promise<PublicationRun> {
    const limit = options.limit || this.policyService.getConfig().defaultBatchLimit;
    const runId = `pubrun-${Date.now()}`;
    const startedAt = new Date().toISOString();

    const queuedItems = await this.repository.getQueuedItems(limit);

    let publishedCount = 0;
    let updatedCount = 0;
    let heldCount = 0;
    let rejectedCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    for (const item of queuedItems) {
      try {
        if (!options.dryRun) {
          await this.repository.updateQueueItemStatus(item.id, 'processing');
        }

        const story = await this.repository.getStoryById(item.storyId);
        if (!story) {
          throw new Error(`Story ${item.storyId} not found in database.`);
        }

        const lifecycleDecision = item.lifecycleEventId
          ? await this.repository.getLifecycleEventById(item.lifecycleEventId)
          : null;

        if (!lifecycleDecision) {
          throw new Error(`Lifecycle event ${item.lifecycleEventId} not found.`);
        }

        const validation = lifecycleDecision.validationId
          ? await this.repository.getValidationById(lifecycleDecision.validationId)
          : null;

        if (!validation) {
          throw new Error(`Validation ${lifecycleDecision.validationId} not found.`);
        }

        const extraction = lifecycleDecision.extractionId
          ? await this.repository.getExtractionById(lifecycleDecision.extractionId)
          : null;

        if (!extraction) {
          throw new Error(`Extraction ${lifecycleDecision.extractionId} not found.`);
        }

        const input: PublicationGateInput = {
          story,
          lifecycleDecision,
          validation,
          extraction,
          scheduledFor: item.scheduledFor || undefined,
          force: options.force,
        };

        const result = await this.publishCandidate(input, {
          force: options.force,
          dryRun: options.dryRun,
        });

        if (result.decision.decision === 'PUBLISH') {
          if (lifecycleDecision.action === 'UPDATE') {
            updatedCount++;
          } else {
            publishedCount++;
          }
          if (!options.dryRun) {
            await this.repository.updateQueueItemStatus(item.id, 'published');
          }
        } else if (result.decision.decision === 'HOLD') {
          heldCount++;
          if (!options.dryRun) {
            await this.repository.updateQueueItemStatus(item.id, 'held', result.decision.reason);
          }
        } else if (result.decision.decision === 'REJECT') {
          rejectedCount++;
          if (!options.dryRun) {
            await this.repository.updateQueueItemStatus(item.id, 'failed', result.decision.reason);
          }
        }
      } catch (err: any) {
        failedCount++;
        errors.push({ itemId: item.id, error: err.message });
        if (!options.dryRun) {
          await this.repository.updateQueueItemStatus(item.id, 'failed', err.message);
        }
      }
    }

    const run: PublicationRun = {
      id: runId,
      startedAt,
      finishedAt: new Date().toISOString(),
      processed: queuedItems.length,
      published: publishedCount,
      updated: updatedCount,
      held: heldCount,
      rejected: rejectedCount,
      failed: failedCount,
      errors,
      createdAt: startedAt,
    };

    if (!options.dryRun) {
      await this.repository.recordPublicationRun(run);
    }

    return run;
  }
}
