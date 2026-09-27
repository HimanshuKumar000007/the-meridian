/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NewsStory, StorySource, StoryUpdate } from './story';
import type { NewsCategory, CategorySortMode, CategoryPageData } from './category';

export interface CategoryStoryQueryOptions {
  subcategory?: string;
  sort?: CategorySortMode;
  limit?: number;
  offset?: number;
}

export interface HomepageData {
  featuredStory: NewsStory;
  latestStories: NewsStory[];
  topStories: NewsStory[];
  trendingStories: NewsStory[];
  mostReadStories: NewsStory[];
  aiTechStories: NewsStory[];
  gamingStories: NewsStory[];
  scienceStories: NewsStory[];
  businessStories: NewsStory[];
  worldStories: NewsStory[];
}

/**
 * Universal News Repository Contract.
 * The UI layer calls this repository abstraction.
 * Currently backed by MockNewsRepository (local mock data);
 * in Phase 5, this will be swapped with a real database repository without changing frontend code.
 */
export interface NewsRepository {
  // Story queries
  getStoryBySlug(slug: string): Promise<NewsStory | null>;
  getStoryById(id: string): Promise<NewsStory | null>;
  getLatestStories(limit?: number): Promise<NewsStory[]>;
  getFeaturedStories(limit?: number): Promise<NewsStory[]>;
  getTrendingStories(limit?: number): Promise<NewsStory[]>;
  getMostReadStories(limit?: number): Promise<NewsStory[]>;
  getStoriesByCategory(categorySlug: string, options?: CategoryStoryQueryOptions): Promise<NewsStory[]>;
  searchStories(query: string): Promise<NewsStory[]>;

  // Sub-entity queries
  getStoryUpdates(storyId: string): Promise<StoryUpdate[]>;
  getStorySources(storyId: string): Promise<StorySource[]>;

  // Category queries
  getCategoryBySlug(slug: string): Promise<NewsCategory | null>;
  getAllCategories(): Promise<NewsCategory[]>;

  // Aggregate page providers
  getHomepageData(): Promise<HomepageData>;
  getCategoryPageData(
    categorySlug: string,
    subcategorySlug?: string,
    sortMode?: CategorySortMode
  ): Promise<CategoryPageData | null>;
}
