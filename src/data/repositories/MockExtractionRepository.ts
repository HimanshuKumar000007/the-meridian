/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ExtractionRepository, ExtractionFilter } from './ExtractionRepository';
import type { NewsExtractionRecord } from '../../types/extraction';
import type { DiscoveryItem } from '../../types/discovery';

export class MockExtractionRepository implements ExtractionRepository {
  private records: Map<string, NewsExtractionRecord> = new Map();
  private discoveryItems: DiscoveryItem[] = [];

  constructor(initialItems: DiscoveryItem[] = [], initialRecords: NewsExtractionRecord[] = []) {
    this.discoveryItems = [...initialItems];
    for (const r of initialRecords) {
      this.records.set(r.id, r);
    }
  }

  public setDiscoveryItems(items: DiscoveryItem[]): void {
    this.discoveryItems = [...items];
  }

  public async findExtraction(
    discoveryItemId: string,
    inputHash: string,
    promptVersion: string
  ): Promise<NewsExtractionRecord | null> {
    for (const record of this.records.values()) {
      if (
        record.discovery_item_id === discoveryItemId &&
        record.input_hash === inputHash &&
        record.prompt_version === promptVersion
      ) {
        return record;
      }
    }
    return null;
  }

  public async saveExtraction(record: NewsExtractionRecord): Promise<void> {
    this.records.set(record.id, { ...record });
  }

  public async getExtractionById(id: string): Promise<NewsExtractionRecord | null> {
    return this.records.get(id) || null;
  }

  public async getExtractions(filter?: ExtractionFilter): Promise<NewsExtractionRecord[]> {
    let list = Array.from(this.records.values());
    if (filter?.status) {
      list = list.filter((r) => r.status === filter.status);
    }
    if (filter?.category) {
      list = list.filter((r) => r.category === filter.category);
    }
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (filter?.limit) {
      list = list.slice(filter.offset || 0, (filter.offset || 0) + filter.limit);
    }
    return list;
  }

  public async getPendingDiscoveryItems(options?: {
    limit?: number;
    category?: string;
    sourceSlug?: string;
    priority?: number;
    includeFailed?: boolean;
  }): Promise<DiscoveryItem[]> {
    const extractedIds = new Set(
      Array.from(this.records.values())
        .filter((r) => (options?.includeFailed ? r.status === 'completed' : r.status !== 'failed'))
        .map((r) => r.discovery_item_id)
    );

    let items = this.discoveryItems.filter((item) => !extractedIds.has(item.id));

    if (options?.category) {
      items = items.filter((i) => i.categoryHint === options.category);
    }

    if (options?.limit) {
      items = items.slice(0, options.limit);
    }

    return items;
  }
}
