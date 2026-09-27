/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExtractionRepository, ExtractionFilter } from './ExtractionRepository';
import type { NewsExtractionRecord } from '../../types/extraction';
import type { DiscoveryItem } from '../../types/discovery';

export class SupabaseExtractionRepository implements ExtractionRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  public async findExtraction(
    discoveryItemId: string,
    inputHash: string,
    promptVersion: string
  ): Promise<NewsExtractionRecord | null> {
    try {
      const { data, error } = await this.client
        .from('news_extractions')
        .select('*')
        .eq('discovery_item_id', discoveryItemId)
        .eq('input_hash', inputHash)
        .eq('prompt_version', promptVersion)
        .maybeSingle();

      if (error) {
        console.error('[SupabaseExtractionRepository] findExtraction error:', error.message);
        return null;
      }

      return data as NewsExtractionRecord | null;
    } catch (err: any) {
      console.error('[SupabaseExtractionRepository] findExtraction exception:', err.message);
      return null;
    }
  }

  public async saveExtraction(record: NewsExtractionRecord): Promise<void> {
    try {
      const { error } = await this.client
        .from('news_extractions')
        .upsert(
          {
            id: record.id,
            discovery_item_id: record.discovery_item_id,
            status: record.status,
            model: record.model,
            prompt_version: record.prompt_version,
            input_hash: record.input_hash,
            output_hash: record.output_hash,
            title: record.title,
            dek: record.dek,
            summary: record.summary,
            summary_points: record.summary_points,
            category: record.category,
            subcategory: record.subcategory,
            classification_confidence: record.classification_confidence,
            content: record.content,
            facts: record.facts,
            entities: record.entities,
            timeline_candidates: record.timeline_candidates,
            source_evidence: record.source_evidence,
            overall_confidence: record.overall_confidence,
            has_conflicts: record.has_conflicts ?? false,
            conflict_details: record.conflict_details,
            error_code: record.error_code,
            error_message: record.error_message,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'discovery_item_id,input_hash,prompt_version',
          }
        );

      if (error) {
        console.error('[SupabaseExtractionRepository] saveExtraction error:', error.message);
        throw error;
      }
    } catch (err: any) {
      console.error('[SupabaseExtractionRepository] saveExtraction exception:', err.message);
      throw err;
    }
  }

  public async getExtractionById(id: string): Promise<NewsExtractionRecord | null> {
    try {
      const { data, error } = await this.client
        .from('news_extractions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[SupabaseExtractionRepository] getExtractionById error:', error.message);
        return null;
      }

      return data as NewsExtractionRecord | null;
    } catch (err: any) {
      console.error('[SupabaseExtractionRepository] getExtractionById exception:', err.message);
      return null;
    }
  }

  public async getExtractions(filter?: ExtractionFilter): Promise<NewsExtractionRecord[]> {
    try {
      let query = this.client
        .from('news_extractions')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter?.status) {
        query = query.eq('status', filter.status);
      }
      if (filter?.category) {
        query = query.eq('category', filter.category);
      }
      if (filter?.limit) {
        query = query.limit(filter.limit);
      }
      if (filter?.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 20) - 1);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[SupabaseExtractionRepository] getExtractions error:', error.message);
        return [];
      }

      return (data || []) as NewsExtractionRecord[];
    } catch (err: any) {
      console.error('[SupabaseExtractionRepository] getExtractions exception:', err.message);
      return [];
    }
  }

  public async getPendingDiscoveryItems(options?: {
    limit?: number;
    category?: string;
    sourceSlug?: string;
    priority?: number;
    includeFailed?: boolean;
  }): Promise<DiscoveryItem[]> {
    try {
      // Fetch completed extractions to exclude them
      const { data: extractedRows } = await this.client
        .from('news_extractions')
        .select('discovery_item_id')
        .eq('status', 'completed');

      const extractedIds = new Set((extractedRows || []).map((r: any) => r.discovery_item_id));

      let query = this.client
        .from('news_discovery_items')
        .select('*, news_sources(slug, name, priority)')
        .order('discovered_at', { ascending: false });

      if (options?.category) {
        query = query.eq('category_hint', options.category);
      }

      const maxLimit = options?.limit || 20;
      query = query.limit(maxLimit * 3); // fetch enough to filter out extracted ones

      const { data, error } = await query;
      if (error) {
        console.error('[SupabaseExtractionRepository] getPendingDiscoveryItems error:', error.message);
        return [];
      }

      const pending: DiscoveryItem[] = [];
      for (const row of data || []) {
        if (!extractedIds.has(row.id)) {
          pending.push({
            id: row.id,
            sourceId: row.source_id,
            sourceSlug: row.news_sources?.slug || 'unknown-source',
            sourceName: row.news_sources?.name || 'News Source',
            sourceType: 'rss',
            externalId: row.external_id,
            sourceUrl: row.canonical_url,
            canonicalUrl: row.canonical_url,
            title: row.title,
            description: row.description,
            publishedAt: row.published_at,
            sourceUpdatedAt: row.source_updated_at,
            discoveredAt: row.discovered_at,
            lastSeenAt: row.last_seen_at,
            author: row.author,
            imageUrl: row.image_url,
            categoryHint: row.category_hint,
            subcategoryHint: row.subcategory_hint,
            rawPayload: row.raw_payload,
            fingerprint: row.fingerprint,
            status: row.status,
            contentHash: row.content_hash,
          });

          if (pending.length >= maxLimit) {
            break;
          }
        }
      }

      return pending;
    } catch (err: any) {
      console.error('[SupabaseExtractionRepository] getPendingDiscoveryItems exception:', err.message);
      return [];
    }
  }
}
