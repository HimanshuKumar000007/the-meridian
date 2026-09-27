/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Story } from '../data/mockNews';

export type SearchSortOption = 'relevance' | 'latest' | 'most_read';
export type SearchDateRange = 'all' | 'today' | 'week' | 'month';

export interface SearchOptions {
  category?: string;
  subcategory?: string;
  sort?: SearchSortOption;
  limit?: number;
  offset?: number;
  dateRange?: SearchDateRange;
}

export interface SearchResult {
  story: Story;
  matchScore: number;
  matchReason: string;
  matchedFields: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  options: SearchOptions;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface SearchSuggestion {
  text: string;
  type: 'title' | 'category' | 'topic' | 'popular';
  slug?: string;
  categoryId?: string;
}

export interface TrendingOptions {
  limit?: number;
  category?: string;
  window?: '24h' | '7d';
}

export interface MostReadOptions {
  limit?: number;
  category?: string;
  window?: 'today' | 'week' | 'month' | 'lifetime';
}

export interface ViewRecordRequest {
  storyId: string;
  sessionHash: string;
}

export interface ViewRecordResult {
  recorded: boolean;
  reason?: string;
  viewCount?: number;
  trendingScore?: number;
  error?: string;
}
