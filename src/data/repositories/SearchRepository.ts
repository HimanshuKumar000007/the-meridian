/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Story } from '../mockNews';
import type {
  SearchOptions,
  SearchResponse,
  SearchSuggestion,
  TrendingOptions,
  MostReadOptions,
  ViewRecordResult,
} from '../../types/search';

export interface SearchRepository {
  searchStories(query: string, options?: SearchOptions): Promise<SearchResponse>;
  getSearchSuggestions(query: string, limit?: number): Promise<SearchSuggestion[]>;
  getTrendingStories(options?: TrendingOptions): Promise<Story[]>;
  getMostReadStories(options?: MostReadOptions): Promise<Story[]>;
  recordStoryView(storyId: string, sessionHash: string): Promise<ViewRecordResult>;
  recalculateTrending(): Promise<number>;
}
