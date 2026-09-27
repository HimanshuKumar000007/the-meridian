/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabase';
import type { Story } from '../mockNews';
import type { SearchRepository } from './SearchRepository';
import type {
  SearchOptions,
  SearchResponse,
  SearchResult,
  SearchSuggestion,
  TrendingOptions,
  MostReadOptions,
  ViewRecordResult,
} from '../../types/search';

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 5) return 'Just now';
    if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`;
    if (diffHours < 24) return `Updated ${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

export class SupabaseSearchRepository implements SearchRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || getSupabaseClient();
  }

  private mapRowToStory(row: any): Story {
    const categoryName =
      row.category?.name ||
      (row.category_id ? row.category_id.charAt(0).toUpperCase() + row.category_id.slice(1) : 'News');
    const subcategoryName = row.subcategory?.name || row.subcategory_id || undefined;
    const authorName = row.author?.name || 'The Meridian Staff';
    const authorRole = row.author?.role || 'Correspondent';
    const authorAvatar = row.author?.avatar_url || undefined;

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary || row.dek || '',
      category: categoryName,
      subcategory: subcategoryName,
      image: row.hero_image_url || '',
      alt: row.hero_image_alt || row.title,
      caption: row.hero_image_caption,
      credit: row.hero_image_credit,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
      timeDisplay: formatRelativeTime(row.published_at),
      author: {
        name: authorName,
        role: authorRole,
        avatar: authorAvatar,
      },
      readTime: '4 min read',
      featured: Boolean(row.is_featured),
    };
  }

  public async searchStories(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const rawQuery = (query || '').trim();
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const offset = Math.max(options.offset ?? 0, 0);
    const sort = options.sort || 'relevance';
    const category = options.category && options.category.toLowerCase() !== 'all' ? options.category : null;

    try {
      // Call the stored procedure search_published_stories
      const { data, error } = await this.client.rpc('search_published_stories', {
        p_query: rawQuery,
        p_category: category,
        p_sort: sort,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) {
        console.error('[SupabaseSearchRepository] RPC search_published_stories error:', error);
        // Fallback to direct table query
        return this.fallbackSearch(rawQuery, options);
      }

      const rows = data || [];
      const results: SearchResult[] = rows.map((r: any) => ({
        story: this.mapRowToStory(r),
        matchScore: Number(r.match_score) || 1.0,
        matchReason: r.match_reason || 'search_match',
        matchedFields: r.match_reason === 'exact_title' || r.match_reason === 'title_match' 
          ? ['title'] 
          : ['title', 'summary'],
      }));

      // Approximate total or run count query
      let total = results.length;
      if (results.length === limit || offset > 0) {
        // Query total count of matching stories
        const countQuery = this.client
          .from('stories')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'published');
        if (category) {
          countQuery.eq('category_id', category);
        }
        if (rawQuery) {
          countQuery.or(`title.ilike.%${rawQuery}%,summary.ilike.%${rawQuery}%`);
        }
        const countRes = await countQuery;
        if (countRes.count !== null && countRes.count !== undefined) {
          total = countRes.count;
        }
      }

      return {
        results,
        total: Math.max(total, results.length),
        query: rawQuery,
        options,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(Math.max(total, results.length) / limit) || 1,
        hasMore: offset + limit < total,
      };
    } catch (err) {
      console.error('[SupabaseSearchRepository] searchStories exception:', err);
      return this.fallbackSearch(rawQuery, options);
    }
  }

  private async fallbackSearch(query: string, options: SearchOptions): Promise<SearchResponse> {
    const rawQuery = (query || '').trim();
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const offset = Math.max(options.offset ?? 0, 0);

    let queryBuilder = this.client
      .from('stories')
      .select(`
        *,
        author:authors(*),
        category:categories(*),
        subcategory:subcategories(*)
      `, { count: 'exact' })
      .eq('status', 'published');

    if (options.category && options.category.toLowerCase() !== 'all') {
      queryBuilder = queryBuilder.eq('category_id', options.category);
    }

    if (rawQuery) {
      queryBuilder = queryBuilder.or(`title.ilike.%${rawQuery}%,summary.ilike.%${rawQuery}%,dek.ilike.%${rawQuery}%`);
    }

    if (options.sort === 'latest') {
      queryBuilder = queryBuilder.order('published_at', { ascending: false });
    } else if (options.sort === 'most_read') {
      queryBuilder = queryBuilder.order('view_count', { ascending: false });
    } else {
      queryBuilder = queryBuilder.order('published_at', { ascending: false });
    }

    queryBuilder = queryBuilder.range(offset, offset + limit - 1);

    const { data, count, error } = await queryBuilder;
    if (error || !data) {
      return {
        results: [],
        total: 0,
        query: rawQuery,
        options,
        page: 1,
        totalPages: 1,
        hasMore: false,
      };
    }

    const results: SearchResult[] = data.map((row: any) => ({
      story: this.mapRowToStory(row),
      matchScore: 1.0,
      matchReason: 'fallback_search',
      matchedFields: ['title', 'summary'],
    }));

    const total = count ?? results.length;
    return {
      results,
      total,
      query: rawQuery,
      options,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: offset + limit < total,
    };
  }

  public async getSearchSuggestions(query: string, limit = 6): Promise<SearchSuggestion[]> {
    const clean = (query || '').trim();
    if (!clean) return [];

    try {
      const { data, error } = await this.client
        .from('stories')
        .select('title, slug, category_id')
        .eq('status', 'published')
        .ilike('title', `%${clean}%`)
        .limit(limit);

      if (error || !data) return [];

      const suggestions: SearchSuggestion[] = data.map((item: any) => ({
        text: item.title,
        type: 'title',
        slug: item.slug,
        categoryId: item.category_id,
      }));

      // Check category match
      const { data: catData } = await this.client
        .from('categories')
        .select('id, name, slug')
        .ilike('name', `%${clean}%`)
        .limit(2);

      if (catData) {
        for (const cat of catData) {
          if (!suggestions.some((s) => s.text.toLowerCase() === cat.name.toLowerCase())) {
            suggestions.unshift({
              text: cat.name,
              type: 'category',
              categoryId: cat.id,
            });
          }
        }
      }

      return suggestions.slice(0, limit);
    } catch {
      return [];
    }
  }

  public async getTrendingStories(options: TrendingOptions = {}): Promise<Story[]> {
    const limit = Math.min(Math.max(options.limit ?? 5, 1), 20);

    try {
      let query = this.client
        .from('stories')
        .select(`
          *,
          author:authors(*),
          category:categories(*),
          subcategory:subcategories(*)
        `)
        .eq('status', 'published');

      if (options.category && options.category.toLowerCase() !== 'all') {
        query = query.eq('category_id', options.category);
      }

      // Order by trending_score DESC, then published_at DESC
      query = query.order('trending_score', { ascending: false })
                   .order('published_at', { ascending: false })
                   .limit(limit);

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((r: any) => this.mapRowToStory(r));
    } catch {
      return [];
    }
  }

  public async getMostReadStories(options: MostReadOptions = {}): Promise<Story[]> {
    const limit = Math.min(Math.max(options.limit ?? 5, 1), 20);

    try {
      let query = this.client
        .from('stories')
        .select(`
          *,
          author:authors(*),
          category:categories(*),
          subcategory:subcategories(*)
        `)
        .eq('status', 'published');

      if (options.category && options.category.toLowerCase() !== 'all') {
        query = query.eq('category_id', options.category);
      }

      // Order by view_count DESC, then published_at DESC
      query = query.order('view_count', { ascending: false })
                   .order('published_at', { ascending: false })
                   .limit(limit);

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((r: any) => this.mapRowToStory(r));
    } catch {
      return [];
    }
  }

  public async recordStoryView(storyId: string, sessionHash: string): Promise<ViewRecordResult> {
    if (!storyId || !sessionHash) {
      return { recorded: false, error: 'missing_parameters' };
    }

    try {
      const { data, error } = await this.client.rpc('record_story_view', {
        p_story_id: storyId,
        p_session_hash: sessionHash,
      });

      if (error) {
        console.error('[SupabaseSearchRepository] record_story_view RPC error:', error);
        return { recorded: false, error: error.message };
      }

      const res = data as any;
      return {
        recorded: Boolean(res.recorded),
        reason: res.reason,
        viewCount: res.view_count,
        trendingScore: res.trending_score,
        error: res.error,
      };
    } catch (err: any) {
      console.error('[SupabaseSearchRepository] recordStoryView exception:', err);
      return { recorded: false, error: err?.message || 'unknown_error' };
    }
  }

  public async recalculateTrending(): Promise<number> {
    try {
      const { data, error } = await this.client.rpc('recalculate_trending_scores');
      if (error) throw error;
      return Number(data) || 0;
    } catch (err) {
      console.error('[SupabaseSearchRepository] recalculateTrending error:', err);
      return 0;
    }
  }
}
