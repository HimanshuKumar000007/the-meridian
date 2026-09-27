/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Supported source types for discovery
 */
export type SourceType =
  | 'rss'
  | 'atom'
  | 'official_feed'
  | 'press_release'
  | 'api';

/**
 * Universal Source Configuration Model
 */
export interface NewsSource {
  id: string;
  slug: string;
  name: string;
  type: SourceType;
  feedUrl: string;
  baseUrl: string;
  country: string;
  language: string;
  priority: number; // 1 = highest, 2 = normal, 3 = low
  pollIntervalMinutes: number;
  categories: string[];
  isActive: boolean;

  // Health and polling telemetry
  lastCheckedAt?: string | null;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  consecutiveFailures: number;
  lastError?: string | null;

  // HTTP caching
  etag?: string | null;
  lastModified?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

/**
 * Lifecycle state of a discovered ingestion candidate
 */
export type DiscoveryStatus =
  | 'new'
  | 'candidate'
  | 'possible_update'
  | 'duplicate'
  | 'processed'
  | 'failed';

/**
 * Universal Discovered Item Model
 * Represents raw normalized feed item before editorial extraction
 */
export interface DiscoveryItem {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;

  externalId?: string | null;
  sourceUrl: string;
  canonicalUrl: string;
  fingerprint: string;

  title: string;
  description?: string | null;
  publishedAt?: string | null;
  sourceUpdatedAt?: string | null;
  discoveredAt: string;
  lastSeenAt: string;

  status: DiscoveryStatus;

  categoryHint?: string | null;
  subcategoryHint?: string | null;

  author?: string | null;
  imageUrl?: string | null;

  rawPayload?: Record<string, any> | null;
  contentHash: string;

  firstSeenAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Result of deduplication check
 */
export type DeduplicationAction = 'new' | 'possible_update' | 'no_op';

export interface DiscoveryDedupeResult {
  action: DeduplicationAction;
  item: DiscoveryItem;
  existingItem?: DiscoveryItem;
  reason?: string;
}

/**
 * Raw parsed feed item directly from RSS/Atom
 */
export interface RawParsedItem {
  title?: string;
  link?: string;
  guid?: string;
  description?: string;
  content?: string;
  pubDate?: string;
  updatedDate?: string;
  author?: string;
  imageUrl?: string;
  categories?: string[];
  raw?: Record<string, any>;
}

/**
 * HTTP Source Fetch Result
 */
export interface SourceFetchResult {
  status: 'success' | 'not_modified' | 'failure';
  statusCode?: number;
  body?: string;
  etag?: string | null;
  lastModified?: string | null;
  error?: string;
  durationMs: number;
}

/**
 * Discovery execution run metrics
 */
export interface DiscoveryRun {
  id: string;
  startedAt: string;
  finishedAt?: string | null;
  sourcesAttempted: number;
  sourcesSucceeded: number;
  sourcesFailed: number;
  itemsSeen: number;
  newItems: number;
  possibleUpdates: number;
  duplicates: number;
  errors: Array<{ sourceSlug: string; error: string }>;
  durationMs?: number;
  createdAt?: string;
}

/**
 * Configuration options for a discovery execution
 */
export interface DiscoveryRunOptions {
  sourceSlugs?: string[];
  forceAll?: boolean; // bypass pollIntervalMinutes check
  maxConcurrency?: number;
  timeoutMs?: number;
  dryRun?: boolean;
}
