/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * MediaPolicyService: Rights, Provenance, Sensitive Topics, and Generation Constraints
 */

import type { ImageRightsStatus, MediaPolicyConfig } from '../../types/media';

export const DEFAULT_MEDIA_POLICY_CONFIG: MediaPolicyConfig = {
  mediaEngineEnabled: true,
  aiImageGenerationEnabled: false, // Strict default: false until explicitly configured & tested
  remoteImageDownloadEnabled: true,
  autoUseVerifiedImages: true,
  allowPublicDomain: true,
  allowLicensed: true,
  allowAIIllustrations: true,
  requireRightsForReuse: true,
  fallbackEnabled: true,
  maxImageJobsPerRun: 5,
  maxAiGenerationsPerRun: 2,
  maxAiGenerationsPerHour: 5,
  heroMinWidth: 600,
  heroMinHeight: 300,
  thumbnailMinWidth: 200,
  maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
  downloadTimeoutMs: 6000, // 6 seconds bounded timeout
  sensitiveNewsPolicy: 'fallback_or_conceptual',
  mediaPolicyVersion: 'v1.0',
  mediaProcessorVersion: 'v1.0',
};

export class MediaPolicyService {
  private config: MediaPolicyConfig;

  constructor(customConfig?: Partial<MediaPolicyConfig>) {
    this.config = {
      ...DEFAULT_MEDIA_POLICY_CONFIG,
      ...this.loadFromEnv(),
      ...customConfig,
    };
  }

  private parseBool(val: string | undefined, defaultVal: boolean): boolean {
    if (val === undefined || val === '') return defaultVal;
    const lower = val.trim().toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }

  private parseInt(val: string | undefined, defaultVal: number, min = 1, max = 1000): number {
    if (!val) return defaultVal;
    const num = parseInt(val, 10);
    if (isNaN(num)) return defaultVal;
    return Math.max(min, Math.min(num, max));
  }

  private loadFromEnv(): Partial<MediaPolicyConfig> {
    if (typeof process === 'undefined' || !process.env) return {};
    return {
      mediaEngineEnabled: this.parseBool(process.env.MEDIA_ENGINE_ENABLED, DEFAULT_MEDIA_POLICY_CONFIG.mediaEngineEnabled),
      aiImageGenerationEnabled: this.parseBool(process.env.AI_IMAGE_GENERATION_ENABLED, DEFAULT_MEDIA_POLICY_CONFIG.aiImageGenerationEnabled),
      remoteImageDownloadEnabled: this.parseBool(process.env.REMOTE_IMAGE_DOWNLOAD_ENABLED, DEFAULT_MEDIA_POLICY_CONFIG.remoteImageDownloadEnabled),
      maxImageJobsPerRun: this.parseInt(process.env.MAX_IMAGE_JOBS_PER_RUN, DEFAULT_MEDIA_POLICY_CONFIG.maxImageJobsPerRun, 1, 20),
      maxAiGenerationsPerRun: this.parseInt(process.env.MAX_AI_IMAGE_GENERATIONS_PER_RUN, DEFAULT_MEDIA_POLICY_CONFIG.maxAiGenerationsPerRun, 1, 10),
      maxAiGenerationsPerHour: this.parseInt(process.env.MAX_AI_IMAGE_GENERATIONS_PER_HOUR, DEFAULT_MEDIA_POLICY_CONFIG.maxAiGenerationsPerHour, 1, 30),
    };
  }

  public getConfig(): MediaPolicyConfig {
    return { ...this.config };
  }

  /**
   * Deterministically validates whether an image rights status permits automated reuse.
   * Public accessible != free to reuse.
   * Unknown rights strictly evaluates to false.
   */
  public isRightsEligible(rightsStatus: ImageRightsStatus): boolean {
    if (!this.config.requireRightsForReuse) {
      return rightsStatus !== 'restricted' && rightsStatus !== 'rejected';
    }

    switch (rightsStatus) {
      case 'verified':
      case 'licensed':
      case 'public_domain':
      case 'permission_granted':
        return true;
      case 'unknown':
      case 'restricted':
      case 'rejected':
      default:
        return false;
    }
  }

  /**
   * Determines if relevance score satisfies threshold for hero candidate.
   */
  public isRelevanceAcceptable(score: number): boolean {
    return score >= 0.60;
  }

  /**
   * Detects sensitive or high-risk editorial topics where photorealistic or AI generation is strictly prohibited.
   */
  public isSensitiveTopic(text: string): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    const sensitiveKeywords = [
      'dead', 'death', 'killed', 'casualty', 'casualties', 'murder', 'shooting',
      'war', 'battlefield', 'missile strike', 'bombing', 'terrorist', 'terrorism',
      'protest', 'riot', 'assassination', 'plane crash', 'earthquake', 'disaster',
      'arrested', 'crime', 'indictment', 'guilty', 'court trial',
      'president', 'prime minister', 'senator', 'election rally', 'campaign rally',
    ];
    return sensitiveKeywords.some(kw => lower.includes(kw));
  }

  /**
   * Evaluates if AI illustration can be considered for a given story.
   */
  public isAiIllustrationAllowed(context: {
    category?: string;
    title?: string;
    summary?: string;
    isSensitive?: boolean;
  }): boolean {
    if (!this.config.aiImageGenerationEnabled || !this.config.allowAIIllustrations) {
      return false;
    }

    const fullText = `${context.title || ''} ${context.summary || ''}`;
    if (context.isSensitive || this.isSensitiveTopic(fullText)) {
      return false;
    }

    // AI conceptual illustrations are suitable for technical, scientific, abstract or analytical topics
    const allowedCategories = ['ai', 'technology', 'science', 'space', 'business'];
    if (context.category && !allowedCategories.includes(context.category.toLowerCase())) {
      return false;
    }

    return true;
  }
}
