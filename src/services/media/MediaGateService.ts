/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * MediaGateService: Decision Engine for Media Eligibility, Selection & Fallbacks
 */

import type {
  ImageCandidate,
  MediaAsset,
  MediaDecision,
  MediaDecisionReason,
} from '../../types/media';
import { MediaPolicyService } from './MediaPolicyService';
import { MediaValidationService } from './MediaValidationService';
import { FallbackMediaService } from './FallbackMediaService';
import { ImageGenerationService } from './ImageGenerationService';
import { MediaStorageService } from './MediaStorageService';

export interface StoryContext {
  id: string;
  title: string;
  slug?: string;
  dek?: string;
  summary?: string;
  category: string;
  existingHeroMedia?: MediaAsset | null;
}

export class MediaGateService {
  private policyService: MediaPolicyService;
  private validationService: MediaValidationService;
  private fallbackService: FallbackMediaService;
  private generationService: ImageGenerationService;
  private storageService: MediaStorageService;

  constructor(options: {
    policyService?: MediaPolicyService;
    validationService?: MediaValidationService;
    fallbackService?: FallbackMediaService;
    generationService?: ImageGenerationService;
    storageService?: MediaStorageService;
  } = {}) {
    this.policyService = options.policyService || new MediaPolicyService();
    this.validationService = options.validationService || new MediaValidationService(this.policyService.getConfig());
    this.fallbackService = options.fallbackService || new FallbackMediaService();
    this.generationService = options.generationService || new ImageGenerationService(undefined, this.policyService);
    this.storageService = options.storageService || new MediaStorageService();
  }

  /**
   * Evaluates candidates and determines the definitive MediaDecision for a story.
   */
  public async evaluateMediaDecision(
    candidates: ImageCandidate[],
    story: StoryContext
  ): Promise<MediaDecision> {
    const config = this.policyService.getConfig();

    // 1. If an approved existing hero media already exists on story update
    if (story.existingHeroMedia && story.existingHeroMedia.validationStatus === 'approved') {
      // Check if any incoming candidate is materially better and rights-verified
      const betterCandidate = this.findSuperiorCandidate(candidates, story);
      if (!betterCandidate) {
        return {
          decision: 'APPROVED',
          mediaId: story.existingHeroMedia.id,
          reason: 'SELECTED_EXISTING_ASSET',
          sourceType: story.existingHeroMedia.sourceType,
          rightsStatus: story.existingHeroMedia.rightsStatus,
          asset: story.existingHeroMedia,
          policyVersion: config.mediaPolicyVersion,
          processorVersion: config.mediaProcessorVersion,
        };
      }
    }

    // 2. Filter and rank candidates by rights eligibility first, then relevance
    const evaluatedCandidates = candidates.map(c => {
      const evalRes = this.validationService.evaluateCandidate(c, story);
      const isRightsOk = this.policyService.isRightsEligible(c.rightsStatus);
      return {
        candidate: c,
        isRightsOk,
        evalRes,
      };
    });

    // 3. Look for verified/licensed candidates that pass technical & relevance validation
    const approvedCandidate = evaluatedCandidates.find(
      item => item.isRightsOk && item.evalRes.valid && item.evalRes.isHeroEligible
    );

    if (approvedCandidate) {
      const c = approvedCandidate.candidate;
      let reason: MediaDecisionReason = 'SELECTED_VERIFIED_SOURCE_IMAGE';
      if (c.rightsStatus === 'licensed') reason = 'SELECTED_LICENSED_IMAGE';
      else if (c.rightsStatus === 'public_domain') reason = 'SELECTED_PUBLIC_DOMAIN_IMAGE';

      const derivatives = this.storageService.computeDerivatives(c.originalUrl, c.mimeType?.split('/')[1] || 'webp');
      const asset: MediaAsset = {
        id: `media-${story.id}-${Date.now()}`,
        storyId: story.id,
        assetType: 'image',
        sourceType: c.sourceType,
        sourceUrl: c.sourceUrl,
        originalUrl: c.originalUrl,
        storageUrl: c.originalUrl,
        rightsStatus: c.rightsStatus,
        provenanceStatus: c.provenanceStatus,
        validationStatus: 'approved',
        credit: c.credit || (c.sourceName ? `Photo: ${c.sourceName}` : undefined),
        caption: c.caption,
        altText: c.altText || `${story.title} hero image`,
        width: c.width || 1200,
        height: c.height || 675,
        aspectRatio: '16:9',
        isIllustrative: Boolean(c.isIllustrative),
        isPrimary: true,
        sortOrder: 0,
        derivatives,
        metadata: {
          relevanceScore: approvedCandidate.evalRes.relevanceScore,
          sourceTag: c.metadata?.sourceTag,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        decision: 'APPROVED',
        mediaId: asset.id,
        reason,
        sourceType: asset.sourceType,
        rightsStatus: asset.rightsStatus,
        asset,
        candidate: c,
        policyVersion: config.mediaPolicyVersion,
        processorVersion: config.mediaProcessorVersion,
      };
    }

    // 4. If any candidate failed strictly due to unknown rights (even if relevant)
    const unknownRightsCandidate = evaluatedCandidates.find(
      item => !item.isRightsOk && item.evalRes.valid && item.candidate.rightsStatus === 'unknown'
    );

    // 5. Check if conceptual AI illustration is permitted by policy
    if (this.policyService.isAiIllustrationAllowed(story)) {
      try {
        const aiAsset = await this.generationService.generateIllustration(story);
        if (aiAsset) {
          return {
            decision: 'APPROVED',
            mediaId: aiAsset.id,
            reason: 'SELECTED_AI_ILLUSTRATION',
            sourceType: 'ai_generated',
            rightsStatus: 'verified',
            asset: aiAsset,
            policyVersion: config.mediaPolicyVersion,
            processorVersion: config.mediaProcessorVersion,
          };
        }
      } catch (err: any) {
        console.warn(`[MediaGateService] AI illustration generation failed: ${err.message}. Gracefully falling back.`);
      }
    }

    // 6. Safe Editorial Fallback
    const fallbackAsset = this.fallbackService.createFallbackAsset(story.id, story.category, story.title);
    const fallbackReason: MediaDecisionReason = unknownRightsCandidate
      ? 'REJECTED_UNKNOWN_RIGHTS'
      : 'SELECTED_FALLBACK';

    return {
      decision: 'FALLBACK',
      mediaId: fallbackAsset.id,
      reason: fallbackReason,
      sourceType: 'fallback',
      rightsStatus: 'verified',
      asset: fallbackAsset,
      policyVersion: config.mediaPolicyVersion,
      processorVersion: config.mediaProcessorVersion,
    };
  }

  /**
   * Helper to check if a new candidate is materially superior to an existing hero image.
   */
  private findSuperiorCandidate(candidates: ImageCandidate[], story: StoryContext): ImageCandidate | null {
    for (const c of candidates) {
      if (this.policyService.isRightsEligible(c.rightsStatus)) {
        const evalRes = this.validationService.evaluateCandidate(c, story);
        if (evalRes.isHeroEligible && evalRes.relevanceScore > 0.85) {
          return c;
        }
      }
    }
    return null;
  }
}
