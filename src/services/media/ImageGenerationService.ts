/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * ImageGenerationProvider & ImageGenerationService
 * Strict Conceptual Editorial Illustrations (No Fake News Photographs)
 */

import { createHash } from 'crypto';
import type { MediaAsset, MediaPolicyConfig } from '../../types/media';
import { MediaPolicyService, DEFAULT_MEDIA_POLICY_CONFIG } from './MediaPolicyService';

export interface GenerationOptions {
  aspectRatio?: '16:9' | '4:3' | '1:1';
  style?: string;
  category?: string;
  promptVersion?: string;
}

export interface GenerationResult {
  url: string;
  provider: string;
  model: string;
  promptVersion: string;
  revisedPrompt?: string;
}

export interface ImageGenerationProvider {
  name: string;
  generateEditorialIllustration(prompt: string, options?: GenerationOptions): Promise<GenerationResult>;
  supports(): boolean;
  healthCheck(): Promise<boolean>;
}

export class MockImageGenerationProvider implements ImageGenerationProvider {
  name = 'mock-conceptual-illustrator';

  supports(): boolean {
    return true;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async generateEditorialIllustration(prompt: string, options: GenerationOptions = {}): Promise<GenerationResult> {
    const promptVersion = options.promptVersion || 'v1.0';
    const cat = (options.category || 'technology').toUpperCase();
    const cleanPrompt = prompt.slice(0, 80).replace(/[<>&"']/g, '');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
  <defs>
    <linearGradient id="aiBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="50%" stop-color="#1E1B4B" />
      <stop offset="100%" stop-color="#311042" />
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#818CF8" />
      <stop offset="50%" stop-color="#C084FC" />
      <stop offset="100%" stop-color="#F472B6" />
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#aiBg)" />
  <circle cx="600" cy="337" r="180" fill="none" stroke="url(#glow)" stroke-width="2" stroke-dasharray="8 6" opacity="0.8" />
  <circle cx="600" cy="337" r="120" fill="none" stroke="#A855F7" stroke-width="1.5" opacity="0.6" />
  <g transform="translate(100, 100)">
    <rect x="0" y="0" width="220" height="28" rx="4" fill="#312E81" />
    <text x="110" y="19" font-family="system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing="2" fill="#E0E7FF" text-anchor="middle">CONCEPTUAL ILLUSTRATION</text>
    <text x="0" y="80" font-family="system-ui, sans-serif" font-size="28" font-weight="700" fill="#FFFFFF">${cat} CONCEPT</text>
    <text x="0" y="120" font-family="Georgia, serif" font-size="20" fill="#CBD5E1">${cleanPrompt}</text>
  </g>
</svg>`;

    const base64 = Buffer.from(svg).toString('base64');
    const url = `data:image/svg+xml;base64,${base64}`;

    return {
      url,
      provider: this.name,
      model: 'conceptual-vector-v1',
      promptVersion,
      revisedPrompt: `Abstract conceptual illustration representing ${prompt}`,
    };
  }
}

export class ImageGenerationService {
  private policyService: MediaPolicyService;
  private provider: ImageGenerationProvider;
  private hourlyCount = 0;
  private hourResetTimestamp = Date.now();

  constructor(
    provider?: ImageGenerationProvider,
    policyService?: MediaPolicyService
  ) {
    this.provider = provider || new MockImageGenerationProvider();
    this.policyService = policyService || new MediaPolicyService();
  }

  /**
   * Generates a deterministic idempotency key for this generation request.
   */
  public computeGenerationKey(storyId: string, prompt: string, promptVersion = 'v1.0'): string {
    return createHash('sha256')
      .update(`${storyId}::${promptVersion}::${prompt.trim().toLowerCase()}`)
      .digest('hex');
  }

  /**
   * Checks budget and hourly rate limits.
   */
  private checkRateLimits(config: MediaPolicyConfig): { allowed: boolean; reason?: string } {
    const now = Date.now();
    if (now - this.hourResetTimestamp > 3600 * 1000) {
      this.hourlyCount = 0;
      this.hourResetTimestamp = now;
    }

    if (this.hourlyCount >= config.maxAiGenerationsPerHour) {
      return {
        allowed: false,
        reason: `Exceeded hourly AI image generation budget (${this.hourlyCount}/${config.maxAiGenerationsPerHour})`,
      };
    }

    return { allowed: true };
  }

  /**
   * Generates a safe, conceptual editorial illustration for an approved story concept.
   */
  public async generateIllustration(
    story: {
      id: string;
      title: string;
      dek?: string;
      summary?: string;
      category: string;
    },
    options: { promptVersion?: string } = {}
  ): Promise<MediaAsset | null> {
    const config = this.policyService.getConfig();

    // 1. Strict Policy Check
    if (!this.policyService.isAiIllustrationAllowed(story)) {
      return null;
    }

    // 2. Budget & Rate Check
    const rateCheck = this.checkRateLimits(config);
    if (!rateCheck.allowed) {
      console.warn(`[ImageGenerationService] ${rateCheck.reason}`);
      return null;
    }

    // 3. Prompt Construction: strictly conceptual, non-photorealistic
    const promptVersion = options.promptVersion || 'meridian-conceptual-v1.0';
    const conceptualPrompt = `A clean, elegant, conceptual vector and diagrammatic illustration representing: ${story.title}. Abstract, minimalist, editorial, suitable for a premier international news publication. No text, no photorealistic human faces, no violence.`;

    try {
      const genResult = await this.provider.generateEditorialIllustration(conceptualPrompt, {
        aspectRatio: '16:9',
        category: story.category,
        promptVersion,
      });

      this.hourlyCount++;
      const now = new Date().toISOString();
      const generationKey = this.computeGenerationKey(story.id, conceptualPrompt, promptVersion);

      return {
        id: `ai-${story.id}-${promptVersion}`,
        storyId: story.id,
        assetType: 'illustration',
        sourceType: 'ai_generated',
        storageUrl: genResult.url,
        rightsStatus: 'verified', // Owned/generated by platform
        provenanceStatus: 'verified',
        validationStatus: 'approved',
        credit: `The Meridian // AI Editorial Concept (${genResult.provider})`,
        caption: 'Conceptual illustration.',
        altText: `Conceptual illustration: ${story.title}`,
        width: 1200,
        height: 675,
        aspectRatio: '16:9',
        format: 'webp',
        mimeType: 'image/webp',
        isIllustrative: true,
        promptVersion: genResult.promptVersion || promptVersion,
        isPrimary: true,
        sortOrder: 0,
        derivatives: {
          desktop: { url: genResult.url, width: 1200, height: 675, format: 'webp' },
          tablet: { url: genResult.url, width: 800, height: 450, format: 'webp' },
          mobile: { url: genResult.url, width: 400, height: 225, format: 'webp' },
          thumbnail: { url: genResult.url, width: 200, height: 112, format: 'webp' },
          openGraph: { url: genResult.url, width: 1200, height: 630, format: 'webp' },
        },
        metadata: {
          generationProvider: genResult.provider,
          generationModel: genResult.model,
          promptVersion: genResult.promptVersion,
          generationKey,
          isConceptual: true,
        },
        createdAt: now,
        updatedAt: now,
      };
    } catch (err: any) {
      console.warn(`[ImageGenerationService] Provider generation failed: ${err.message}`);
      return null;
    }
  }
}
