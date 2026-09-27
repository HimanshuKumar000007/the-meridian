/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NewsSource, DiscoveryItem, DiscoveryRun } from '../../types/discovery';
import type { DiscoveryRepository, DiscoverySaveResult } from './DiscoveryRepository';
import { INITIAL_NEWS_SOURCES } from '../sources/initialSources';

/**
 * In-memory Mock Discovery Repository for offline testing and development.
 */
export class MockDiscoveryRepository implements DiscoveryRepository {
  private sources: Map<string, NewsSource> = new Map();
  private items: Map<string, DiscoveryItem> = new Map();
  private runs: DiscoveryRun[] = [];

  constructor(initialSources: NewsSource[] = INITIAL_NEWS_SOURCES) {
    initialSources.forEach((s) => this.sources.set(s.id, { ...s }));
  }

  public async getSources(filter?: { activeOnly?: boolean }): Promise<NewsSource[]> {
    const list = Array.from(this.sources.values());
    if (filter?.activeOnly) {
      return list.filter((s) => s.isActive);
    }
    return list;
  }

  public async getSourceById(id: string): Promise<NewsSource | null> {
    return this.sources.get(id) || null;
  }

  public async getSourceBySlug(slug: string): Promise<NewsSource | null> {
    const list = Array.from(this.sources.values());
    return list.find((s) => s.slug === slug) || null;
  }

  public async upsertSources(newSources: NewsSource[]): Promise<void> {
    for (const src of newSources) {
      this.sources.set(src.id, { ...src });
    }
  }

  public async updateSourceHealth(id: string, health: Partial<NewsSource>): Promise<void> {
    const existing = this.sources.get(id);
    if (existing) {
      this.sources.set(id, {
        ...existing,
        ...health,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  public async getExistingItemsForDeduplication(sourceId?: string): Promise<DiscoveryItem[]> {
    const list = Array.from(this.items.values());
    if (sourceId) {
      return list.filter((item) => item.sourceId === sourceId);
    }
    return list;
  }

  public async saveDiscoveryItems(candidates: DiscoveryItem[]): Promise<DiscoverySaveResult> {
    let inserted = 0;
    let updated = 0;
    let noop = 0;

    for (const item of candidates) {
      const existing = this.items.get(item.fingerprint);
      if (!existing) {
        this.items.set(item.fingerprint, { ...item });
        inserted++;
      } else if (item.status === 'possible_update' || item.contentHash !== existing.contentHash) {
        this.items.set(item.fingerprint, { ...item });
        updated++;
      } else {
        // No-op: update lastSeenAt
        this.items.set(item.fingerprint, {
          ...existing,
          lastSeenAt: item.lastSeenAt,
        });
        noop++;
      }
    }

    return { inserted, updated, noop };
  }

  public async getDiscoveryItemByFingerprint(fingerprint: string): Promise<DiscoveryItem | null> {
    return this.items.get(fingerprint) || null;
  }

  public async getDiscoveryItemByUrl(canonicalUrl: string): Promise<DiscoveryItem | null> {
    const list = Array.from(this.items.values());
    return list.find((i) => i.canonicalUrl === canonicalUrl) || null;
  }

  public async getPendingDiscoveryItems(limit = 50): Promise<DiscoveryItem[]> {
    const list = Array.from(this.items.values());
    return list
      .filter((i) => i.status === 'new' || i.status === 'candidate')
      .slice(0, limit);
  }

  public async recordDiscoveryRun(run: DiscoveryRun): Promise<void> {
    this.runs.unshift({ ...run });
    // Retain only last 50 runs in memory
    if (this.runs.length > 50) {
      this.runs.pop();
    }
  }

  public async getRecentDiscoveryRuns(limit = 10): Promise<DiscoveryRun[]> {
    return this.runs.slice(0, limit);
  }
}
