/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Meridian — Global News Platform
 * RssMonitorService: Safe, deterministic RSS & Atom feed monitor for approved sources.
 * Reuses existing SourceFetcher, FeedParser, and URL normalization.
 */

import { SourceFetcher } from '../discovery/SourceFetcher';
import { FeedParser } from '../discovery/FeedParser';
import { normalizeSourceUrl } from '../discovery/normalizeUrl';
import { generateDiscoveryFingerprint } from '../discovery/fingerprint';
import type { ApprovedSource, StoryLead } from './types';
import { ApprovedSourceRegistry } from './ApprovedSourceRegistry';

export interface RssMonitorOptions {
  fetcher?: SourceFetcher;
  parser?: FeedParser;
  registry?: ApprovedSourceRegistry;
}

export interface PollResult {
  sourceId: string;
  sourceName: string;
  success: boolean;
  leadsFound: StoryLead[];
  newLeadsCount: number;
  duplicateLeadsCount: number;
  error?: string;
  durationMs: number;
}

export class RssMonitorService {
  private fetcher: SourceFetcher;
  private parser: FeedParser;
  private registry: ApprovedSourceRegistry;
  private seenFingerprints: Set<string> = new Set();
  private seenCanonicalUrls: Set<string> = new Set();

  constructor(options: RssMonitorOptions = {}) {
    this.fetcher = options.fetcher || new SourceFetcher();
    this.parser = options.parser || new FeedParser();
    this.registry = options.registry || new ApprovedSourceRegistry();
  }

  /**
   * Prime deduplication cache with known fingerprints and URLs (e.g. from DB).
   */
  public seedKnownItems(items: Array<{ fingerprint?: string; canonicalUrl?: string }>): void {
    for (const item of items) {
      if (item.fingerprint) this.seenFingerprints.add(item.fingerprint);
      if (item.canonicalUrl) this.seenCanonicalUrls.add(normalizeSourceUrl(item.canonicalUrl));
    }
  }

  /**
   * Monitor a single approved source feed.
   */
  public async monitorSource(source: ApprovedSource): Promise<PollResult> {
    const startTime = Date.now();
    try {
      // Map to NewsSource structure expected by SourceFetcher
      const fetchResult = await this.fetcher.fetchSource({
        id: source.source_id,
        slug: source.source_id.replace(/^src-/, ''),
        name: source.source_name,
        type: source.source_type,
        feedUrl: source.feed_url,
        baseUrl: source.feed_url,
        country: 'Global',
        language: 'en',
        priority: source.priority ?? 1,
        pollIntervalMinutes: source.polling_cadence_minutes ?? source.pollingCadence ?? 10,
        categories: source.category_hints ?? [source.category.toLowerCase()],
        isActive: source.active ?? source.is_active ?? true,
        consecutiveFailures: source.consecutive_failures ?? source.errorCount ?? 0,
      });

      if (fetchResult.status === 'failure' || !fetchResult.body) {
        const error = fetchResult.error || 'Empty or failed feed response';
        this.registry.updateSourceHealth(source.source_id, { success: false, error });
        return {
          sourceId: source.source_id,
          sourceName: source.source_name,
          success: false,
          leadsFound: [],
          newLeadsCount: 0,
          duplicateLeadsCount: 0,
          error,
          durationMs: Date.now() - startTime,
        };
      }

      this.registry.updateSourceHealth(source.source_id, { success: true });

      // 2. Parse XML safely using Fast-XML-Parser
      const rawParsedItems = this.parser.parse(fetchResult.body);

      const leads: StoryLead[] = [];
      let newCount = 0;
      let dupCount = 0;

      for (const item of rawParsedItems) {
        if (!item.title || !item.link) continue;

        const canonicalUrl = normalizeSourceUrl(item.link);
        const fingerprint = generateDiscoveryFingerprint({
          title: item.title,
          canonicalUrl,
          sourceIdentity: source.source_id,
        });

        // Deduplication check
        const isDuplicate =
          this.seenFingerprints.has(fingerprint) ||
          this.seenCanonicalUrls.has(canonicalUrl);

        if (isDuplicate) {
          dupCount++;
          continue;
        }

        // New lead detected
        newCount++;
        this.seenFingerprints.add(fingerprint);
        this.seenCanonicalUrls.add(canonicalUrl);

        const publishedAt = item.pubDate
          ? new Date(item.pubDate).toISOString()
          : new Date().toISOString();

        leads.push({
          id: `lead-${fingerprint.substring(0, 16)}`,
          sourceId: source.source_id,
          sourceName: source.source_name,
          title: item.title.trim(),
          canonicalUrl,
          publishedAt,
          description: (item.description || '').trim(),
          categoryHint: (source.category_hints && source.category_hints[0]) || source.category?.toLowerCase() || 'general',
          fingerprint,
          discoveredAt: new Date().toISOString(),
          rawPayload: item.raw,
        });
      }

      return {
        sourceId: source.source_id,
        sourceName: source.source_name,
        success: true,
        leadsFound: leads,
        newLeadsCount: newCount,
        duplicateLeadsCount: dupCount,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      this.registry.updateSourceHealth(source.source_id, { success: false, error: errorMsg });
      return {
        sourceId: source.source_id,
        sourceName: source.source_name,
        success: false,
        leadsFound: [],
        newLeadsCount: 0,
        duplicateLeadsCount: 0,
        error: errorMsg,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Monitor all active approved sources with bounded concurrency.
   */
  public async monitorAllSources(concurrency = 3): Promise<PollResult[]> {
    const activeSources = this.registry.getApprovedSources({ activeOnly: true });
    const results: PollResult[] = [];

    // Process in batches
    for (let i = 0; i < activeSources.length; i += concurrency) {
      const batch = activeSources.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map((src) => this.monitorSource(src)));
      results.push(...batchResults);
    }

    return results;
  }
}
