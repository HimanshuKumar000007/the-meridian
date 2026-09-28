/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * MediaValidationService: Technical Quality & Deterministic Relevance Evaluation
 */

import type { ImageCandidate, MediaPolicyConfig } from '../../types/media';
import { DEFAULT_MEDIA_POLICY_CONFIG } from './MediaPolicyService';

export interface ValidationEvaluationResult {
  valid: boolean;
  relevanceScore: number;
  reason: string;
  isHeroEligible: boolean;
}

export class MediaValidationService {
  constructor(private config: MediaPolicyConfig = DEFAULT_MEDIA_POLICY_CONFIG) {}

  /**
   * Evaluates if URL or metadata matches known non-content assets (logos, ads, avatars, trackers).
   */
  public isJunkAsset(candidate: ImageCandidate): { isJunk: boolean; reason?: string } {
    const raw = `${candidate.originalUrl} ${candidate.altText || ''} ${candidate.caption || ''}`.toLowerCase();

    // 1x1 or tiny tracking pixel
    if (
      (candidate.width !== undefined && candidate.width <= 10) ||
      (candidate.height !== undefined && candidate.height <= 10)
    ) {
      return { isJunk: true, reason: 'Tracking pixel or micro-graphic detected' };
    }

    // Known junk terms in path or alt text
    const junkPatterns = [
      /\blogo\b/,
      /\bicon\b/,
      /\bavatar\b/,
      /\bbadge\b/,
      /\btracker\b/,
      /\btracking\b/,
      /\bpixel\b/,
      /\bspinner\b/,
      /\bplaceholder\b/,
      /\btransparent\b/,
      /\bspacer\b/,
      /\b1x1\b/,
      /\badvertisement\b/,
      /\bsponsored\b/,
      /\bbanner-ad\b/,
    ];

    for (const pat of junkPatterns) {
      if (pat.test(raw)) {
        return { isJunk: true, reason: `Matches junk or decorative asset pattern: ${pat.source}` };
      }
    }

    return { isJunk: false };
  }

  /**
   * Deterministically computes relevance score between candidate metadata and story content.
   * Returns a normalized score from 0.00 to 1.00.
   */
  public computeRelevance(
    candidate: ImageCandidate,
    storyContext: {
      title: string;
      dek?: string;
      summary?: string;
      category?: string;
    }
  ): number {
    const junkCheck = this.isJunkAsset(candidate);
    if (junkCheck.isJunk) {
      return 0.05;
    }

    // If source type is fallback, relevance is fixed at 1.00 (designed for story)
    if (candidate.sourceType === 'fallback') {
      return 1.00;
    }

    // Tokenize story text into significant keywords (3+ letters, lowercased, excluding common stop words)
    const stopWords = new Set([
      'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'were', 'been',
      'will', 'would', 'could', 'should', 'about', 'after', 'before', 'into', 'over',
      'more', 'most', 'some', 'such', 'than', 'them', 'then', 'they', 'what', 'when',
      'http', 'https', 'www', 'com', 'net', 'org', 'jpg', 'jpeg', 'png', 'webp', 'svg',
      'gif', 'images', 'image', 'img', 'uploads', 'upload', 'content', 'assets', 'preview',
    ]);

    const storyText = `${storyContext.title} ${storyContext.dek || ''} ${storyContext.summary || ''} ${storyContext.category || ''}`.toLowerCase();
    const storyTokens = storyText
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    if (storyTokens.length === 0) return 0.50;

    // Tokenize candidate textual signals
    const candidateText = `${candidate.altText || ''} ${candidate.caption || ''} ${candidate.originalUrl}`.toLowerCase();
    const candidateTokens = candidateText
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    let matchedTokens = 0;
    const uniqueTokens = new Set(candidateTokens);
    for (const token of uniqueTokens) {
      const isMatch = storyTokens.some(st => {
        if (st === token) return true;
        if (st.length >= 5 && token.length >= 5 && (st.startsWith(token.slice(0, 5)) || token.startsWith(st.slice(0, 5)))) {
          return true;
        }
        return false;
      });
      if (isMatch) {
        matchedTokens++;
      }
    }

    // Direct keyword match ratio (3 matched keywords gives full match weight)
    const matchRatio = Math.min(1.0, matchedTokens / 3);

    // Source placement bonus
    let placementBonus = 0.20;
    if (candidate.sourceType === 'publisher' || candidate.sourceType === 'official' || candidate.sourceType === 'licensed' || candidate.sourceType === 'public_domain') {
      placementBonus += 0.10;
    }
    if (candidate.metadata?.sourceTag === 'og:image' || candidate.metadata?.sourceTag === 'hero') {
      placementBonus += 0.15;
    }

    // If zero keywords match, keep score below 0.35 (unrelated)
    if (matchedTokens === 0) {
      return 0.20;
    }

    const calculatedScore = Math.min(1.0, Math.max(0.1, matchRatio * 0.60 + placementBonus));
    return parseFloat(calculatedScore.toFixed(2));
  }

  /**
   * Evaluates technical viability and dimension requirements.
   */
  public validateTechnical(candidate: ImageCandidate): { valid: boolean; reason?: string } {
    const junk = this.isJunkAsset(candidate);
    if (junk.isJunk) {
      return { valid: false, reason: junk.reason };
    }

    if (candidate.width !== undefined && candidate.width < this.config.thumbnailMinWidth) {
      return {
        valid: false,
        reason: `Image width (${candidate.width}px) is below minimum thumbnail width (${this.config.thumbnailMinWidth}px)`,
      };
    }

    return { valid: true };
  }

  /**
   * Complete candidate evaluation.
   */
  public evaluateCandidate(
    candidate: ImageCandidate,
    storyContext: {
      title: string;
      dek?: string;
      summary?: string;
      category?: string;
    }
  ): ValidationEvaluationResult {
    const techCheck = this.validateTechnical(candidate);
    if (!techCheck.valid) {
      return {
        valid: false,
        relevanceScore: 0.0,
        reason: techCheck.reason || 'Technical validation failed',
        isHeroEligible: false,
      };
    }

    const score = this.computeRelevance(candidate, storyContext);
    const isHeroEligible =
      score >= 0.60 &&
      (candidate.width === undefined || candidate.width >= this.config.heroMinWidth);

    return {
      valid: score >= 0.40,
      relevanceScore: score,
      reason: isHeroEligible ? 'Candidate passed validation and is hero-eligible' : 'Candidate has modest relevance',
      isHeroEligible,
    };
  }
}
