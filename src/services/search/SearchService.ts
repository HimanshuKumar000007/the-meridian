/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SearchRepository } from '../../data/repositories/SearchRepository';
import type {
  SearchOptions,
  SearchResponse,
  SearchSuggestion,
} from '../../types/search';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class SearchService {
  private repository: SearchRepository;
  private cache: Map<string, CacheEntry<SearchResponse>> = new Map();
  private cacheTtlMs = 30000; // 30 seconds

  constructor(repository: SearchRepository) {
    this.repository = repository;
  }

  /**
   * Safe normalization of search input:
   * - Trim whitespace
   * - Collapse multiple whitespace
   * - Limit length to 200 chars
   * - Remove control characters
   */
  public normalizeQuery(rawQuery: string): string {
    if (!rawQuery) return '';
    return rawQuery
      .replace(/[\x00-\x1F\x7F]/g, '') // remove control chars
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 200);
  }

  /**
   * Execute search with normalization, bounding, and caching
   */
  public async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const cleanQuery = this.normalizeQuery(query);
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const offset = Math.max(options.offset ?? 0, 0);

    const safeOptions: SearchOptions = {
      ...options,
      limit,
      offset,
    };

    // Cache key for common queries
    const cacheKey = `${cleanQuery.toLowerCase()}_${options.category || 'all'}_${options.sort || 'rel'}_${limit}_${offset}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const response = await this.repository.searchStories(cleanQuery, safeOptions);

    // Cache results
    this.cache.set(cacheKey, {
      data: response,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return response;
  }

  /**
   * Get search suggestions (5-8 max)
   */
  public async getSuggestions(query: string, limit = 6): Promise<SearchSuggestion[]> {
    const cleanQuery = this.normalizeQuery(query);
    if (!cleanQuery || cleanQuery.length < 2) {
      return [];
    }
    const safeLimit = Math.min(Math.max(limit, 1), 8);
    return this.repository.getSearchSuggestions(cleanQuery, safeLimit);
  }

  /**
   * Clear in-memory query cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}
