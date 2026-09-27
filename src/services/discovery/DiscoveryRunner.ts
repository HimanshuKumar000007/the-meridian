/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  NewsSource,
  DiscoveryItem,
  DiscoveryRun,
  DiscoveryRunOptions,
} from '../../types/discovery';
import type { DiscoveryRepository } from '../../data/repositories/DiscoveryRepository';
import { SourceFetcher } from './SourceFetcher';
import { FeedParser } from './FeedParser';
import { DiscoveryNormalizer } from './DiscoveryNormalizer';
import { DiscoveryDeduplicator } from './DiscoveryDeduplicator';
import { SourceRegistryService } from './SourceRegistryService';

/**
 * Concurrency limiter that executes tasks with a bounded maximum concurrent worker count.
 */
async function asyncPool<T, R>(
  concurrency: number,
  items: T[],
  iteratorFn: (item: T) => Promise<R>
): Promise<R[]> {
  const ret: Promise<R>[] = [];
  const executing: Promise<any>[] = [];

  for (const item of items) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);

    if (concurrency <= items.length) {
      const e: Promise<any> = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }
  }

  return Promise.all(ret);
}

/**
 * Discovery Pipeline Orchestrator.
 * Coordinates fetching, parsing, normalising, deduplication, persistence, and health tracking.
 */
export class DiscoveryRunner {
  private repository: DiscoveryRepository;
  private registryService: SourceRegistryService;
  private fetcher: SourceFetcher;
  private parser: FeedParser;
  private normalizer: DiscoveryNormalizer;
  private deduplicator: DiscoveryDeduplicator;

  constructor(repository: DiscoveryRepository, fetcher?: SourceFetcher) {
    this.repository = repository;
    this.registryService = new SourceRegistryService(repository);
    this.fetcher = fetcher || new SourceFetcher();
    this.parser = new FeedParser();
    this.normalizer = new DiscoveryNormalizer();
    this.deduplicator = new DiscoveryDeduplicator();
  }

  /**
   * Universal Discovery Entry Point.
   */
  public async runDiscovery(options: DiscoveryRunOptions = {}): Promise<DiscoveryRun> {
    const startTime = Date.now();
    const runId = `run-${startTime}-${Math.random().toString(36).slice(2, 7)}`;
    const startedAt = new Date(startTime).toISOString();

    const dueSources = await this.registryService.getDueSources({
      forceAll: options.forceAll,
      sourceSlugs: options.sourceSlugs,
    });

    const concurrency = Math.max(1, Math.min(options.maxConcurrency ?? 3, 10));

    let sourcesSucceeded = 0;
    let sourcesFailed = 0;
    let itemsSeen = 0;
    let newItems = 0;
    let possibleUpdates = 0;
    let duplicates = 0;
    const errors: Array<{ sourceSlug: string; error: string }> = [];

    // Pre-load existing items for deduplication
    const existingItems = await this.repository.getExistingItemsForDeduplication();
    const lookupIndex = this.deduplicator.buildLookupIndex(existingItems);

    // Process sources through controlled concurrency queue
    await asyncPool(concurrency, dueSources, async (source: NewsSource) => {
      try {
        const result = await this.processSingleSource(source, lookupIndex, options.dryRun);

        if (result.success) {
          sourcesSucceeded++;
          itemsSeen += result.itemsSeen;
          newItems += result.newItems;
          possibleUpdates += result.possibleUpdates;
          duplicates += result.duplicates;
        } else {
          sourcesFailed++;
          errors.push({ sourceSlug: source.slug, error: result.error || 'Unknown error' });
        }
      } catch (err: any) {
        sourcesFailed++;
        const errMsg = err?.message || String(err);
        errors.push({ sourceSlug: source.slug, error: errMsg });
      }
    });

    const finishedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    const runSummary: DiscoveryRun = {
      id: runId,
      startedAt,
      finishedAt,
      sourcesAttempted: dueSources.length,
      sourcesSucceeded,
      sourcesFailed,
      itemsSeen,
      newItems,
      possibleUpdates,
      duplicates,
      errors,
      durationMs,
    };

    if (!options.dryRun) {
      await this.repository.recordDiscoveryRun(runSummary);
    }

    this.logRunSummary(runSummary);

    return runSummary;
  }

  private async processSingleSource(
    source: NewsSource,
    lookupIndex: Map<string, DiscoveryItem>,
    dryRun = false
  ): Promise<{
    success: boolean;
    itemsSeen: number;
    newItems: number;
    possibleUpdates: number;
    duplicates: number;
    error?: string;
  }> {
    const checkTimestamp = new Date().toISOString();

    // 1. Fetch
    const fetchResult = await this.fetcher.fetchSource(source);

    if (fetchResult.status === 'failure') {
      // Update health failure
      if (!dryRun) {
        await this.repository.updateSourceHealth(source.id, {
          lastCheckedAt: checkTimestamp,
          lastFailureAt: checkTimestamp,
          consecutiveFailures: (source.consecutiveFailures || 0) + 1,
          lastError: fetchResult.error,
        });
      }
      return { success: false, itemsSeen: 0, newItems: 0, possibleUpdates: 0, duplicates: 0, error: fetchResult.error };
    }

    if (fetchResult.status === 'not_modified') {
      // Source content unchanged via ETag / Last-Modified
      if (!dryRun) {
        await this.repository.updateSourceHealth(source.id, {
          lastCheckedAt: checkTimestamp,
          lastSuccessAt: checkTimestamp,
          consecutiveFailures: 0,
          lastError: null,
          etag: fetchResult.etag,
          lastModified: fetchResult.lastModified,
        });
      }
      return { success: true, itemsSeen: 0, newItems: 0, possibleUpdates: 0, duplicates: 0 };
    }

    // 2. Parse
    const rawItems = this.parser.parse(fetchResult.body || '');

    // 3. Normalize & Deduplicate
    const candidatesToSave: DiscoveryItem[] = [];
    let itemsSeen = 0;
    let newItems = 0;
    let possibleUpdates = 0;
    let duplicates = 0;

    for (const rawItem of rawItems) {
      itemsSeen++;
      const candidate = this.normalizer.normalizeItem(rawItem, source);
      if (!candidate) continue;

      const dedupeResult = this.deduplicator.evaluateCandidate(candidate, lookupIndex);

      if (dedupeResult.action === 'new') {
        newItems++;
        candidatesToSave.push(dedupeResult.item);
        // Update lookup index in memory for subsequent items in same run
        lookupIndex.set(dedupeResult.item.fingerprint, dedupeResult.item);
        lookupIndex.set(`url:${dedupeResult.item.canonicalUrl}`, dedupeResult.item);
      } else if (dedupeResult.action === 'possible_update') {
        possibleUpdates++;
        candidatesToSave.push(dedupeResult.item);
        lookupIndex.set(dedupeResult.item.fingerprint, dedupeResult.item);
      } else {
        // No-op (duplicate)
        duplicates++;
        candidatesToSave.push(dedupeResult.item);
      }
    }

    // 4. Persist
    if (!dryRun && candidatesToSave.length > 0) {
      await this.repository.saveDiscoveryItems(candidatesToSave);
    }

    // 5. Update health success
    if (!dryRun) {
      await this.repository.updateSourceHealth(source.id, {
        lastCheckedAt: checkTimestamp,
        lastSuccessAt: checkTimestamp,
        consecutiveFailures: 0,
        lastError: null,
        etag: fetchResult.etag,
        lastModified: fetchResult.lastModified,
      });
    }

    return {
      success: true,
      itemsSeen,
      newItems,
      possibleUpdates,
      duplicates,
    };
  }

  private logRunSummary(run: DiscoveryRun): void {
    const duration = run.durationMs ? `${(run.durationMs / 1000).toFixed(2)}s` : 'N/A';
    console.log('\n========================================');
    console.log('THE MERIDIAN — DISCOVERY RUN COMPLETE');
    console.log('========================================');
    console.log(`Run ID:           ${run.id}`);
    console.log(`Started:          ${run.startedAt}`);
    console.log(`Duration:         ${duration}`);
    console.log(`Sources Attempted: ${run.sourcesAttempted}`);
    console.log(`Sources Succeeded: ${run.sourcesSucceeded}`);
    console.log(`Sources Failed:    ${run.sourcesFailed}`);
    console.log(`Items Seen:       ${run.itemsSeen}`);
    console.log(`New Candidates:   ${run.newItems}`);
    console.log(`Possible Updates: ${run.possibleUpdates}`);
    console.log(`Duplicates:       ${run.duplicates}`);
    if (run.errors.length > 0) {
      console.log(`Errors (${run.errors.length}):`);
      run.errors.forEach((e) => console.log(`  - [${e.sourceSlug}]: ${e.error}`));
    }
    console.log('========================================\n');
  }
}
