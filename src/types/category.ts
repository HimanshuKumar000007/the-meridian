/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Story } from '../data/mockNews';

export interface CategorySubcategory {
  id: string;
  slug: string;
  name: string;
  description?: string;
  categorySlug?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface NewsCategory {
  id: string;
  slug: string;
  name: string;
  displayName?: string;
  shortName?: string;
  description: string;
  longDescription?: string;
  isActive?: boolean;
  displayOrder?: number;
  subcategories: CategorySubcategory[];
  featuredTopic?: string;
}

export type CategorySortMode = 'latest' | 'trending' | 'most-read' | 'featured';
export type CategoryViewMode = 'grid' | 'list';

export interface CategoryPageData {
  category: NewsCategory;
  activeSubcategory?: string;
  featuredStories: Story[];
  latestStories: Story[];
  trendingStories: Story[];
  mostReadStories: Story[];
  totalCount: number;
}
