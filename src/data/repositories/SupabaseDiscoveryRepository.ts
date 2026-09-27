/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NewsSource, DiscoveryItem, DiscoveryRun } from '../../types/discovery';
import type { DiscoveryRepository, DiscoverySaveResult } from './DiscoveryRepository';
import { getSupabaseClient } from '../../lib/supabase';
import { INITIAL_NEWS_SOURCES } from '../sources/initialSources';

/**
 * Supabase-backed Discovery Repository.
 */
export class SupabaseDiscoveryRepository implements DiscoveryRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || getSupabaseClient();
  }

  // ==========================================
  // SOURCE MANAGEMENT
  // ==========================================

  public async getSources(filter?: { activeOnly?: boolean }): Promise<NewsSource[]> {
    try {
      let query = this.client.from('news_sources').select('*').order('priority', { ascending: true });

      if (filter?.activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        // If empty, auto-seed with INITIAL_NEWS_SOURCES
        if (data && data.length === 0) {
          await this.upsertSources(INITIAL_NEWS_SOURCES);
          return INITIAL_NEWS_SOURCES.filter((s) => (filter?.activeOnly ? s.isActive : true));
        }
        return [];
      }

      return data.map((row) => this.mapSourceRowToModel(row));
    } catch (err) {
      console.error('[SupabaseDiscoveryRepository] getSources error:', err);
      return [];
    }
  }

  public async getSourceById(id: string): Promise<NewsSource | null> {
    try {
      const { data, error } = await this.client
        .from('news_sources')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;
      return this.mapSourceRowToModel(data);
    } catch {
      return null;
    }
  }

  public async getSourceBySlug(slug: string): Promise<NewsSource | null> {
    try {
      const { data, error } = await this.client
        .from('news_sources')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error || !data) return null;
      return this.mapSourceRowToModel(data);
    } catch {
      return null;
    }
  }

  public async upsertSources(sources: NewsSource[]): Promise<void> {
    if (!sources || sources.length === 0) return;

    const rows = sources.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      type: s.type,
      feed_url: s.feedUrl,
      base_url: s.baseUrl,
      country: s.country,
      language: s.language,
      priority: s.priority,
      poll_interval_minutes: s.pollIntervalMinutes,
      categories: s.categories,
      is_active: s.isActive,
      last_checked_at: s.lastCheckedAt || null,
      last_success_at: s.lastSuccessAt || null,
      last_failure_at: s.lastFailureAt || null,
      consecutive_failures: s.consecutiveFailures || 0,
      last_error: s.lastError || null,
      etag: s.etag || null,
      last_modified: s.lastModified || null,
      updated_at: new Date().toISOString(),
    }));

    try {
      await this.client.from('news_sources').upsert(rows, { onConflict: 'id' });
    } catch (err) {
      console.error('[SupabaseDiscoveryRepository] upsertSources error:', err);
    }
  }

  public async updateSourceHealth(id: string, health: Partial<NewsSource>): Promise<void> {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (health.lastCheckedAt !== undefined) updatePayload.last_checked_at = health.lastCheckedAt;
    if (health.lastSuccessAt !== undefined) updatePayload.last_success_at = health.lastSuccessAt;
    if (health.lastFailureAt !== undefined) updatePayload.last_failure_at = health.lastFailureAt;
    if (health.consecutiveFailures !== undefined) updatePayload.consecutive_failures = health.consecutiveFailures;
    if (health.lastError !== undefined) updatePayload.last_error = health.lastError;
    if (health.etag !== undefined) updatePayload.etag = health.etag;
    if (health.lastModified !== undefined) updatePayload.last_modified = health.lastModified;

    try {
      await this.client.from('news_sources').update(updatePayload).eq('id', id);
    } catch (err) {
      console.error('[SupabaseDiscoveryRepository] updateSourceHealth error:', err);
    }
  }

  // ==========================================
  // DISCOVERY ITEMS MANAGEMENT
  // ==========================================

  public async getExistingItemsForDeduplication(sourceId?: string): Promise<DiscoveryItem[]> {
    try {
      let query = this.client
        .from('news_discovery_items')
        .select('*')
        .order('discovered_at', { ascending: false })
        .limit(500);

      if (sourceId) {
        query = query.eq('source_id', sourceId);
      }

      const { data, error } = await query;
      if (error || !data) return [];
      return data.map((row) => this.mapDiscoveryRowToModel(row));
    } catch {
      return [];
    }
  }

  public async saveDiscoveryItems(candidates: DiscoveryItem[]): Promise<DiscoverySaveResult> {
    if (!candidates || candidates.length === 0) {
      return { inserted: 0, updated: 0, noop: 0 };
    }

    let inserted = 0;
    let updated = 0;
    let noop = 0;

    const rowsToUpsert = candidates.map((item) => {
      if (item.status === 'new' || item.status === 'candidate') {
        inserted++;
      } else if (item.status === 'possible_update') {
        updated++;
      } else {
        noop++;
      }

      return {
        id: item.id,
        source_id: item.sourceId,
        external_id: item.externalId || null,
        fingerprint: item.fingerprint,
        canonical_url: item.canonicalUrl,
        title: item.title,
        description: item.description || null,
        published_at: item.publishedAt || null,
        source_updated_at: item.sourceUpdatedAt || null,
        discovered_at: item.discoveredAt,
        last_seen_at: item.lastSeenAt,
        status: item.status,
        category_hint: item.categoryHint || null,
        subcategory_hint: item.subcategoryHint || null,
        author: item.author || null,
        image_url: item.imageUrl || null,
        raw_payload: item.rawPayload || {},
        content_hash: item.contentHash,
        updated_at: new Date().toISOString(),
      };
    });

    try {
      const { error } = await this.client
        .from('news_discovery_items')
        .upsert(rowsToUpsert, { onConflict: 'fingerprint' });

      if (error) {
        console.error('[SupabaseDiscoveryRepository] saveDiscoveryItems error:', error.message);
      }
    } catch (err) {
      console.error('[SupabaseDiscoveryRepository] saveDiscoveryItems exception:', err);
    }

    return { inserted, updated, noop };
  }

  public async getDiscoveryItemByFingerprint(fingerprint: string): Promise<DiscoveryItem | null> {
    try {
      const { data, error } = await this.client
        .from('news_discovery_items')
        .select('*')
        .eq('fingerprint', fingerprint)
        .maybeSingle();

      if (error || !data) return null;
      return this.mapDiscoveryRowToModel(data);
    } catch {
      return null;
    }
  }

  public async getDiscoveryItemByUrl(canonicalUrl: string): Promise<DiscoveryItem | null> {
    try {
      const { data, error } = await this.client
        .from('news_discovery_items')
        .select('*')
        .eq('canonical_url', canonicalUrl)
        .maybeSingle();

      if (error || !data) return null;
      return this.mapDiscoveryRowToModel(data);
    } catch {
      return null;
    }
  }

  public async getPendingDiscoveryItems(limit = 50): Promise<DiscoveryItem[]> {
    try {
      const { data, error } = await this.client
        .from('news_discovery_items')
        .select('*')
        .in('status', ['new', 'candidate', 'possible_update'])
        .order('discovered_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data.map((row) => this.mapDiscoveryRowToModel(row));
    } catch {
      return [];
    }
  }

  // ==========================================
  // AUDIT RUN LOGS
  // ==========================================

  public async recordDiscoveryRun(run: DiscoveryRun): Promise<void> {
    try {
      await this.client.from('discovery_runs').insert({
        id: run.id,
        started_at: run.startedAt,
        finished_at: run.finishedAt || null,
        sources_attempted: run.sourcesAttempted,
        sources_succeeded: run.sourcesSucceeded,
        sources_failed: run.sourcesFailed,
        items_seen: run.itemsSeen,
        new_items: run.newItems,
        possible_updates: run.possibleUpdates,
        duplicates: run.duplicates,
        errors: run.errors,
      });
    } catch (err) {
      console.error('[SupabaseDiscoveryRepository] recordDiscoveryRun error:', err);
    }
  }

  public async getRecentDiscoveryRuns(limit = 10): Promise<DiscoveryRun[]> {
    try {
      const { data, error } = await this.client
        .from('discovery_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data.map((row) => ({
        id: row.id,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        sourcesAttempted: row.sources_attempted,
        sourcesSucceeded: row.sources_succeeded,
        sourcesFailed: row.sources_failed,
        itemsSeen: row.items_seen,
        newItems: row.new_items,
        possibleUpdates: row.possible_updates,
        duplicates: row.duplicates,
        errors: row.errors || [],
      }));
    } catch {
      return [];
    }
  }

  // ==========================================
  // MAPPERS
  // ==========================================

  private mapSourceRowToModel(row: any): NewsSource {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      type: row.type,
      feedUrl: row.feed_url,
      baseUrl: row.base_url,
      country: row.country,
      language: row.language,
      priority: row.priority,
      pollIntervalMinutes: row.poll_interval_minutes,
      categories: row.categories || [],
      isActive: row.is_active,
      lastCheckedAt: row.last_checked_at,
      lastSuccessAt: row.last_success_at,
      lastFailureAt: row.last_failure_at,
      consecutiveFailures: row.consecutive_failures || 0,
      lastError: row.last_error,
      etag: row.etag,
      lastModified: row.last_modified,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapDiscoveryRowToModel(row: any): DiscoveryItem {
    return {
      id: row.id,
      sourceId: row.source_id,
      sourceName: row.source_id,
      sourceType: 'rss',
      externalId: row.external_id,
      sourceUrl: row.canonical_url,
      canonicalUrl: row.canonical_url,
      fingerprint: row.fingerprint,
      title: row.title,
      description: row.description,
      publishedAt: row.published_at,
      sourceUpdatedAt: row.source_updated_at,
      discoveredAt: row.discovered_at,
      lastSeenAt: row.last_seen_at,
      status: row.status,
      categoryHint: row.category_hint,
      subcategoryHint: row.subcategory_hint,
      author: row.author,
      imageUrl: row.image_url,
      rawPayload: row.raw_payload,
      contentHash: row.content_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
