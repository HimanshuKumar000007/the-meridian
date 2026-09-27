/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NewsSource, DiscoveryItem, DiscoveryRun } from '../../types/discovery';

export interface DiscoverySaveResult {
  inserted: number;
  updated: number;
  noop: number;
}

/**
 * Universal Discovery Repository Interface
 */
export interface DiscoveryRepository {
  // Source Management
  getSources(filter?: { activeOnly?: boolean }): Promise<NewsSource[]>;
  getSourceById(id: string): Promise<NewsSource | null>;
  getSourceBySlug(slug: string): Promise<NewsSource | null>;
  upsertSources(sources: NewsSource[]): Promise<void>;
  updateSourceHealth(id: string, health: Partial<NewsSource>): Promise<void>;

  // Discovery Items Management
  getExistingItemsForDeduplication(sourceId?: string): Promise<DiscoveryItem[]>;
  saveDiscoveryItems(items: DiscoveryItem[]): Promise<DiscoverySaveResult>;
  getDiscoveryItemByFingerprint(fingerprint: string): Promise<DiscoveryItem | null>;
  getDiscoveryItemByUrl(canonicalUrl: string): Promise<DiscoveryItem | null>;
  getPendingDiscoveryItems(limit?: number): Promise<DiscoveryItem[]>;

  // Audit Run Logs
  recordDiscoveryRun(run: DiscoveryRun): Promise<void>;
  getRecentDiscoveryRuns(limit?: number): Promise<DiscoveryRun[]>;
}
