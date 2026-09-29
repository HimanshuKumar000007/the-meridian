/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ExtractionRepository, ExtractionFilter } from './ExtractionRepository';
import type { NewsExtractionRecord } from '../../types/extraction';
import type { DiscoveryItem, DiscoveryStatus } from '../../types/discovery';
import { isWithinRecencyWindow } from '../../config/discoveryRecencyPolicy';
import {
  parseExtractionRetryInfo,
  shouldRetryExtraction,
  getMaxExtractionRetries,
} from '../../config/extractionRetryPolicy';

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

  public async updateDiscoveryItemStatus(id: string, status: DiscoveryStatus): Promise<void> {
    const item = this.discoveryItems.find((i) => i.id === id);
    if (item) {
      item.status = status;
    }
  }

  public async getPendingDiscoveryItems(options?: {
    limit?: number;
    category?: string;
    sourceSlug?: string;
    priority?: number;
    includeFailed?: boolean;
    maxRetries?: number;
  }): Promise<DiscoveryItem[]> {
    const maxRetries = options?.maxRetries ?? getMaxExtractionRetries();

    // Map discovery_item_id to its latest extraction record
    const extractionMap = new Map<string, NewsExtractionRecord>();
    for (const record of this.records.values()) {
      extractionMap.set(record.discovery_item_id, record);
    }

    // Filter items:
    // 1. Must be in active state ('new' or 'candidate')
    // 2. Must be within the deterministic recency window
    // 3. Must not be already extracted ('completed' or 'needs_review')
    // 4. Must not have exceeded bounded retry limit if previously failed
    let items = this.discoveryItems.filter((item) => {
      // 1. Check status
      if (item.status !== 'new' && item.status !== 'candidate') {
        return false;
      }

      // 2. Check deterministic recency window
      if (!isWithinRecencyWindow(item)) {
        return false;
      }

      // 3. Check extraction history
      const existing = extractionMap.get(item.id);
      if (existing) {
        if (existing.status === 'completed' || existing.status === 'needs_review') {
          return false;
        }

        if (existing.status === 'failed') {
          const info = parseExtractionRetryInfo(existing.conflict_details, existing.error_code);
          if (!shouldRetryExtraction(info.attempts, existing.error_code, maxRetries)) {
            return false;
          }
          if (options?.includeFailed === false) {
            return false;
          }
        }
      }

      return true;
    });

    if (options?.category) {
      items = items.filter((i) => i.categoryHint === options.category);
    }

    if (options?.sourceSlug) {
      items = items.filter((i) => i.sourceSlug === options.sourceSlug);
    }

    // Sort newest discovered first
    items.sort((a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime());

    if (options?.limit) {
      items = items.slice(0, options.limit);
    }

    return items;
  }
}

