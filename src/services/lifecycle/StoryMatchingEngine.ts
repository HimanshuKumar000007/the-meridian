/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ExtractedNewsCandidate } from '../../types/extraction';
import type { Story, StorySource } from '../../types/story';
import type { StoryCluster, StoryMatchResult } from '../../types/lifecycle';
import { StoryClusteringService } from './StoryClusteringService';

export interface ExistingStoryContext {
  story: Story;
  cluster?: StoryCluster | null;
  sources: StorySource[];
}

export class StoryMatchingEngine {
  private clusteringService: StoryClusteringService;

  constructor(clusteringService?: StoryClusteringService) {
    this.clusteringService = clusteringService || new StoryClusteringService();
  }

  /**
   * Jaccard similarity between two token sets
   */
  private computeJaccard(tokensA: string[], tokensB: string[]): number {
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    if (setA.size === 0 || setB.size === 0) return 0;

    let intersection = 0;
    for (const t of setA) {
      if (setB.has(t)) intersection++;
    }
    const union = new Set([...setA, ...setB]).size;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Strips tracking parameters from a URL for clean canonical comparison
   */
  public normalizeUrl(url?: string | null): string {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      parsed.search = '';
      parsed.hash = '';
      let href = parsed.toString().toLowerCase();
      if (href.endsWith('/')) href = href.slice(0, -1);
      return href;
    } catch {
      return (url || '').toLowerCase().trim();
    }
  }

  /**
   * Evaluates matching against existing stories and clusters
   */
  public match(
    candidate: ExtractedNewsCandidate,
    candidateClusterKey: string,
    existingStories: ExistingStoryContext[]
  ): StoryMatchResult {
    const candidateUrls = (candidate.sources || []).map((s) => this.normalizeUrl(s.url));
    const candidateEntities = this.clusteringService.extractPrimaryEntities(candidate);
    const candidateEventType = this.clusteringService.extractEventType(candidate.title, candidate.summary);
    const candidateTokens = this.clusteringService.tokenize(candidate.title);
    const candidateCategory = (candidate.category || '').toLowerCase();

    // 1. STAGE 1: Exact Canonical Source URL Match
    for (const ctx of existingStories) {
      for (const src of ctx.sources) {
        const normExistingUrl = this.normalizeUrl(src.url);
        if (normExistingUrl && candidateUrls.includes(normExistingUrl)) {
          return {
            matchedStory: ctx.story,
            matchedCluster: ctx.cluster || null,
            confidence: 'high',
            reason: 'MATCH_CANONICAL_URL',
            similarityScore: 1.0,
          };
        }
      }
    }

    // 2. STAGE 2: Exact Cluster Key Match
    for (const ctx of existingStories) {
      if (ctx.cluster && ctx.cluster.clusterKey === candidateClusterKey) {
        return {
          matchedStory: ctx.story,
          matchedCluster: ctx.cluster,
          confidence: 'high',
          reason: 'MATCH_EXISTING_CLUSTER',
          similarityScore: 0.98,
        };
      }
    }

    // 3. STAGE 3: Structured Event Signature & Semantic Overlap
    let bestMatch: ExistingStoryContext | null = null;
    let highestScore = 0;

    for (const ctx of existingStories) {
      const story = ctx.story;
      const storyCategory = (story.category || '').toLowerCase();

      // Category check: must be in same or compatible domain
      if (storyCategory && candidateCategory && storyCategory !== candidateCategory) {
        // Incompatible categories cannot represent the same event
        if (storyCategory === 'sports' || candidateCategory === 'sports') continue;
      }

      const storyTokens = this.clusteringService.tokenize(story.title);
      const titleJaccard = this.computeJaccard(candidateTokens, storyTokens);
      const storyEventType = this.clusteringService.extractEventType(story.title, story.summary);

      // CRITICAL PRINCIPLE: NEVER OVER-MERGE
      // If the event actions clearly conflict (e.g. earnings vs product launch), DO NOT MERGE!
      if (
        candidateEventType !== 'general' &&
        storyEventType !== 'general' &&
        candidateEventType !== storyEventType
      ) {
        continue;
      }

      // Check entity overlap
      const storyEntities = this.clusteringService.tokenize(`${story.title} ${story.summary}`);
      let matchingEntitiesCount = 0;
      for (const ent of candidateEntities) {
        if (storyEntities.some((t) => ent.includes(t) || t.includes(ent))) {
          matchingEntitiesCount++;
        }
      }

      const entityOverlapRatio = candidateEntities.length > 0
        ? matchingEntitiesCount / candidateEntities.length
        : 0;

      // Event Date check
      let dateMatch = true;
      if (candidate.eventDate && story.published_at) {
        const d1 = new Date(candidate.eventDate).getTime();
        const d2 = new Date(story.published_at).getTime();
        if (!isNaN(d1) && !isNaN(d2)) {
          const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
          if (diffDays > 30) {
            dateMatch = false; // Over a month apart is a separate or follow-up event
          }
        }
      }

      if (!dateMatch) continue;

      // Composite score: 60% title similarity + 40% entity overlap
      const compositeScore = titleJaccard * 0.6 + entityOverlapRatio * 0.4;

      if (compositeScore > highestScore) {
        highestScore = compositeScore;
        bestMatch = ctx;
      }
    }

    // High confidence threshold for same event from different publishers
    if (bestMatch && highestScore >= 0.50) {
      return {
        matchedStory: bestMatch.story,
        matchedCluster: bestMatch.cluster || null,
        confidence: highestScore >= 0.70 ? 'high' : 'medium',
        reason: 'MATCH_EVENT_SIGNATURE',
        similarityScore: Number(highestScore.toFixed(2)),
      };
    }

    return {
      matchedStory: null,
      matchedCluster: null,
      confidence: 'none',
      reason: 'NO_MATCH',
      similarityScore: 0,
    };
  }
}
