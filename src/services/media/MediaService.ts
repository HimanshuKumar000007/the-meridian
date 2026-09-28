/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * MediaService: Master Facade for Image & Media Lifecycle Operations
 */

import type {
  ImageCandidate,
  MediaAsset,
  MediaDecision,
  MediaAuditEventType,
} from '../../types/media';
import type { MediaRepository } from '../../data/repositories/MediaRepository';
import { MediaPolicyService } from './MediaPolicyService';
import { MediaSecurityService } from './MediaSecurityService';
import { MediaValidationService } from './MediaValidationService';
import { ImageDiscoveryService } from './ImageDiscoveryService';
import { FallbackMediaService } from './FallbackMediaService';
import { ImageGenerationService } from './ImageGenerationService';
import { MediaStorageService } from './MediaStorageService';
import { MediaGateService, type StoryContext } from './MediaGateService';

export interface MediaAuditReport {
  timestamp: string;
  totalAssets: number;
  rightsDistribution: Record<string, number>;
  storiesWithoutHeroMedia: Array<{ id: string; title: string; slug: string; category: string }>;
  orphanMedia: MediaAsset[];
  queueDepth: number;
  oldestQueueItemAgeSec: number | null;
}

export class MediaService {
  private repository: MediaRepository;
  private policyService: MediaPolicyService;
  private securityService: MediaSecurityService;
  private validationService: MediaValidationService;
  private discoveryService: ImageDiscoveryService;
  private fallbackService: FallbackMediaService;
  private generationService: ImageGenerationService;
  private storageService: MediaStorageService;
  private gateService: MediaGateService;

  constructor(
    repository: MediaRepository,
    options: {
      policyService?: MediaPolicyService;
      securityService?: MediaSecurityService;
      validationService?: MediaValidationService;
      discoveryService?: ImageDiscoveryService;
      fallbackService?: FallbackMediaService;
      generationService?: ImageGenerationService;
      storageService?: MediaStorageService;
      gateService?: MediaGateService;
    } = {}
  ) {
    this.repository = repository;
    this.policyService = options.policyService || new MediaPolicyService();
    this.securityService = options.securityService || new MediaSecurityService();
    this.validationService = options.validationService || new MediaValidationService(this.policyService.getConfig());
    this.discoveryService = options.discoveryService || new ImageDiscoveryService();
    this.fallbackService = options.fallbackService || new FallbackMediaService();
    this.generationService = options.generationService || new ImageGenerationService(undefined, this.policyService);
    this.storageService = options.storageService || new MediaStorageService(repository);
    this.gateService =
      options.gateService ||
      new MediaGateService({
        policyService: this.policyService,
        validationService: this.validationService,
        fallbackService: this.fallbackService,
        generationService: this.generationService,
        storageService: this.storageService,
      });
  }

  public getPolicyService(): MediaPolicyService {
    return this.policyService;
  }

  public getSecurityService(): MediaSecurityService {
    return this.securityService;
  }

  public getValidationService(): MediaValidationService {
    return this.validationService;
  }

  public getDiscoveryService(): ImageDiscoveryService {
    return this.discoveryService;
  }

  public getFallbackService(): FallbackMediaService {
    return this.fallbackService;
  }

  public getGenerationService(): ImageGenerationService {
    return this.generationService;
  }

  public getStorageService(): MediaStorageService {
    return this.storageService;
  }

  public getGateService(): MediaGateService {
    return this.gateService;
  }

  /**
   * Evaluates candidates, selects the appropriate media, saves asset, and attaches to story.
   */
  public async processStoryMedia(
    story: StoryContext,
    candidates: ImageCandidate[] = [],
    options: { persist?: boolean } = { persist: true }
  ): Promise<MediaDecision> {
    const decision = await this.gateService.evaluateMediaDecision(candidates, story);

    if (options.persist && decision.asset) {
      // 1. Check if asset already exists in DB
      let asset = await this.repository.getAssetById(decision.asset.id);
      if (!asset) {
        asset = await this.repository.createAsset(decision.asset);
      }

      // 2. Attach hero media to story
      try {
        await this.repository.attachHeroMedia(story.id, asset.id);
      } catch (err: any) {
        console.warn(`[MediaService] attachHeroMedia note: ${err.message}`);
      }

      // 3. Record audit event
      let eventType: MediaAuditEventType = 'MEDIA_APPROVED';
      if (decision.decision === 'FALLBACK') eventType = 'MEDIA_FALLBACK_SELECTED';
      else if (decision.sourceType === 'ai_generated') eventType = 'MEDIA_GENERATED';
      else if (story.existingHeroMedia && story.existingHeroMedia.id !== asset.id) eventType = 'MEDIA_REPLACED';

      await this.repository.createAuditEvent({
        mediaId: asset.id,
        storyId: story.id,
        eventType,
        reason: decision.reason,
        source: asset.sourceUrl || asset.originalUrl,
        actor: 'system',
        oldMediaId: story.existingHeroMedia?.id,
        newMediaId: asset.id,
        metadata: {
          decision: decision.decision,
          sourceType: decision.sourceType,
          rightsStatus: decision.rightsStatus,
        },
      });
    }

    return decision;
  }

  /**
   * Processes a bounded batch of queued media processing jobs.
   */
  public async processQueue(limit = 5): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: string[];
  }> {
    const jobs = await this.repository.getNextPendingJobs(limit);
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const job of jobs) {
      await this.repository.updateJobStatus(job.id, 'processing');
      try {
        if (job.jobType === 'attach' && job.storyId && job.mediaId) {
          await this.repository.attachHeroMedia(job.storyId, job.mediaId);
        }
        await this.repository.updateJobStatus(job.id, 'completed');
        succeeded++;
      } catch (err: any) {
        failed++;
        errors.push(`Job ${job.id} failed: ${err.message}`);
        await this.repository.updateJobStatus(job.id, 'failed', err.message);
      }
    }

    return {
      processed: jobs.length,
      succeeded,
      failed,
      errors,
    };
  }

  /**
   * Revokes an existing media asset and safely replaces it with an editorial fallback.
   */
  public async revokeMedia(mediaId: string, reason: string): Promise<void> {
    const asset = await this.repository.getAssetById(mediaId);
    if (!asset) return;

    await this.repository.revokeMedia(mediaId, reason);

    if (asset.storyId) {
      const fallback = this.fallbackService.createFallbackAsset(asset.storyId, 'editorial');
      const savedFallback = await this.repository.createAsset(fallback);
      await this.repository.attachHeroMedia(asset.storyId, savedFallback.id);
      await this.repository.createAuditEvent({
        mediaId: savedFallback.id,
        storyId: asset.storyId,
        eventType: 'MEDIA_FALLBACK_SELECTED',
        reason: `Replaced revoked media ${mediaId}: ${reason}`,
        oldMediaId: mediaId,
        newMediaId: savedFallback.id,
        actor: 'system',
      });
    }
  }

  /**
   * Runs an audit across media assets, orphans, and stories without hero media.
   */
  public async auditMedia(): Promise<MediaAuditReport> {
    const [
      rightsDistribution,
      storiesWithoutHeroMedia,
      orphanMedia,
      queueDepth,
      oldestQueueItemAgeSec,
    ] = await Promise.all([
      this.repository.getRightsDistribution(),
      this.repository.getStoriesWithoutHeroMedia(50),
      this.repository.getOrphanMedia(50),
      this.repository.getQueueDepth(),
      this.repository.getOldestPendingJobAgeSec(),
    ]);

    const totalAssets = Object.values(rightsDistribution).reduce((sum, c) => sum + c, 0);

    return {
      timestamp: new Date().toISOString(),
      totalAssets,
      rightsDistribution,
      storiesWithoutHeroMedia,
      orphanMedia,
      queueDepth,
      oldestQueueItemAgeSec,
    };
  }
}
