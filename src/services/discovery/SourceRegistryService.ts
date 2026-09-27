/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NewsSource } from '../../types/discovery';
import type { DiscoveryRepository } from '../../data/repositories/DiscoveryRepository';

/**
 * Service to manage source registration, dynamic lookup, and polling schedules.
 */
export class SourceRegistryService {
  private repository: DiscoveryRepository;

  constructor(repository: DiscoveryRepository) {
    this.repository = repository;
  }

  /**
   * Retrieves all active sources from the registry.
   */
  public async getActiveSources(): Promise<NewsSource[]> {
    return this.repository.getSources({ activeOnly: true });
  }

  /**
   * Identifies which sources are due for polling based on configured intervals,
   * last check timestamps, and failure backoffs.
   */
  public async getDueSources(options: { forceAll?: boolean; sourceSlugs?: string[] } = {}): Promise<NewsSource[]> {
    const activeSources = await this.getActiveSources();

    // 1. If explicit slugs requested, filter immediately
    if (options.sourceSlugs && options.sourceSlugs.length > 0) {
      const slugSet = new Set(options.sourceSlugs.map((s) => s.toLowerCase()));
      return activeSources.filter((src) => slugSet.has(src.slug.toLowerCase()));
    }

    // 2. If forceAll flag is set, return all active sources ordered by priority
    if (options.forceAll) {
      return this.sortByPriority(activeSources);
    }

    const now = Date.now();
    const dueSources: NewsSource[] = [];

    for (const source of activeSources) {
      if (this.isSourceDue(source, now)) {
        dueSources.push(source);
      }
    }

    return this.sortByPriority(dueSources);
  }

  /**
   * Evaluates if an individual source is due for its next check.
   */
  public isSourceDue(source: NewsSource, now = Date.now()): boolean {
    if (!source.isActive) return false;

    // Never checked -> Due immediately
    if (!source.lastCheckedAt) return true;

    const lastCheckedTime = new Date(source.lastCheckedAt).getTime();
    if (isNaN(lastCheckedTime)) return true;

    // Calculate effective interval with exponential backoff on consecutive failures
    // (up to 4x base interval to protect degrading upstream servers)
    let effectiveIntervalMinutes = source.pollIntervalMinutes || 15;
    if (source.consecutiveFailures > 0) {
      const backoffMultiplier = Math.min(Math.pow(2, source.consecutiveFailures), 4);
      effectiveIntervalMinutes = effectiveIntervalMinutes * backoffMultiplier;
    }

    const elapsedMinutes = (now - lastCheckedTime) / (60 * 1000);
    return elapsedMinutes >= effectiveIntervalMinutes;
  }

  private sortByPriority(sources: NewsSource[]): NewsSource[] {
    return [...sources].sort((a, b) => {
      // Lower number = higher priority (1 before 2)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // If priority matches, sort by least recently checked
      const timeA = a.lastCheckedAt ? new Date(a.lastCheckedAt).getTime() : 0;
      const timeB = b.lastCheckedAt ? new Date(b.lastCheckedAt).getTime() : 0;
      return timeA - timeB;
    });
  }
}
