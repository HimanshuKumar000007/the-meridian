/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from 'crypto';
import type { ExtractedNewsCandidate } from '../../types/extraction';
import type { StoryCluster } from '../../types/lifecycle';

// Standard event action keywords to extract event type
const EVENT_TYPE_KEYWORDS: Record<string, string[]> = {
  launch: ['launch', 'launches', 'unveil', 'unveils', 'announce', 'announces', 'release', 'releases', 'introduce', 'introduces', 'reveal', 'reveals'],
  earnings: ['earnings', 'revenue', 'profit', 'quarterly', 'q1', 'q2', 'q3', 'q4', 'financial results', 'fiscal'],
  acquisition: ['acquire', 'acquires', 'acquisition', 'buy', 'buys', 'merge', 'merges', 'merger', 'takeover'],
  regulation: ['ban', 'bans', 'lawsuit', 'sue', 'sues', 'investigate', 'investigation', 'fine', 'fined', 'antitrust', 'sanction', 'bill', 'law'],
  discovery: ['discover', 'discovers', 'discovery', 'find', 'finds', 'breakthrough', 'unearth', 'unearths', 'observe', 'observes'],
  accord: ['accord', 'treaty', 'pact', 'agreement', 'deal', 'summit', 'talks', 'negotiation'],
  conflict: ['strike', 'attack', 'bomb', 'clash', 'offensive', 'casualties', 'ceasefire', 'war'],
  milestone: ['milestone', 'record', 'benchmark', 'achieve', 'achieves', 'first ever', 'surpass'],
};

// Common stopwords to exclude from subject/noun fingerprinting
const STOPWORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'has', 'have',
  'had', 'new', 'after', 'over', 'into', 'amid', 'as', 'its', 'their', 'this',
  'that', 'report', 'reports', 'said', 'says', 'about', 'first', 'major'
]);

export class StoryClusteringService {
  /**
   * Normalizes a text string into clean alphanumeric lowercase tokens
   */
  public tokenize(text: string): string[] {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  }

  /**
   * Extracts the prominent event action from title and summary
   */
  public extractEventType(title: string, summary: string): string {
    const combined = `${title} ${summary}`.toLowerCase();
    for (const [eventType, keywords] of Object.entries(EVENT_TYPE_KEYWORDS)) {
      if (keywords.some((kw) => combined.includes(kw))) {
        return eventType;
      }
    }
    return 'general';
  }

  /**
   * Normalizes primary subject entities
   */
  public extractPrimaryEntities(candidate: ExtractedNewsCandidate): string[] {
    const entities = (candidate.entities || [])
      .filter((e) => e.relevance >= 0.5)
      .map((e) => e.name.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim())
      .filter((e) => e.length > 2);

    if (entities.length > 0) {
      return Array.from(new Set(entities)).sort().slice(0, 3);
    }

    // Fallback: extract prominent noun tokens from title
    const titleTokens = this.tokenize(candidate.title);
    return titleTokens.slice(0, 2);
  }

  /**
   * Computes event date bucket (e.g. "2026-09" or "2026-W39")
   */
  public computeDateBucket(dateStr?: string | null): string {
    if (!dateStr) {
      const now = new Date();
      return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return '2026-09';
    }
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Generates a stable deterministic cluster key.
   * Format: clus_<category>_<entityHash>_<eventType>_<dateBucket>
   */
  public generateClusterKey(candidate: ExtractedNewsCandidate): string {
    const category = (candidate.category || 'general').toLowerCase().trim();
    const primaryEntities = this.extractPrimaryEntities(candidate);
    const eventType = this.extractEventType(candidate.title, candidate.summary);
    const dateBucket = this.computeDateBucket(candidate.eventDate || candidate.publishedAt);

    // Entity representation
    const entitySignature = primaryEntities.join('-') || 'unknown';
    const entityHash = createHash('md5').update(entitySignature).digest('hex').substring(0, 8);

    // Raw key
    const rawKey = `${category}:${entityHash}:${eventType}:${dateBucket}`;
    const cleanSlug = `${category}-${entitySignature.substring(0, 30).replace(/\s+/g, '-')}-${eventType}-${dateBucket}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');

    return `cluster_${cleanSlug}`;
  }

  /**
   * Creates a StoryCluster object for a new candidate
   */
  public createCluster(candidate: ExtractedNewsCandidate): StoryCluster {
    const clusterKey = this.generateClusterKey(candidate);
    const now = new Date().toISOString();
    const clusterId = `clus_${createHash('md5').update(clusterKey).digest('hex').substring(0, 16)}`;

    return {
      id: clusterId,
      clusterKey,
      canonicalTitle: candidate.title,
      primaryCategory: candidate.category || 'world',
      primarySubcategory: candidate.subcategory || null,
      eventDate: candidate.eventDate || candidate.publishedAt || now,
      status: 'active',
      metadata: {
        eventType: this.extractEventType(candidate.title, candidate.summary),
        primaryEntities: this.extractPrimaryEntities(candidate),
        originStoryId: candidate.id,
      },
      createdAt: now,
      updatedAt: now,
    };
  }
}
