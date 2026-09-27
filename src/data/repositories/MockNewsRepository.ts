/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NewsStory, StorySource, StoryUpdate, Fact } from '../../types/story';
import type { NewsCategory, CategorySortMode, CategoryPageData } from '../../types/category';
import type { NewsRepository, HomepageData, CategoryStoryQueryOptions } from '../../types/repository';
import { MOCK_CATEGORIES } from '../mockCategories';
import { MOCK_STORIES_DATA } from '../mockStoriesData';
import { MOCK_STORIES, type Story } from '../mockNews';
import { enrichStoryWithEditorialContent } from '../storyDatabase';

export class MockNewsRepository implements NewsRepository {
  private categories: NewsCategory[];
  private stories: NewsStory[];

  constructor(
    categories: NewsCategory[] = MOCK_CATEGORIES,
    stories: NewsStory[] = MOCK_STORIES_DATA
  ) {
    this.categories = [...categories];

    // Combine detailed stories with enriched mock stories ensuring all legacy slugs exist
    const storyMap = new Map<string, NewsStory>();

    // 1. Detailed stories
    stories.forEach((s) => storyMap.set(s.slug, s));

    // 2. Fallback enrich any remaining from MOCK_STORIES
    MOCK_STORIES.forEach((s) => {
      if (!storyMap.has(s.slug)) {
        storyMap.set(s.slug, enrichStoryWithEditorialContent(s));
      }
    });

    this.stories = Array.from(storyMap.values());
  }

  /**
   * Allows hot-swapping the in-memory story provider (proves provider decoupling)
   */
  public setStoriesProvider(newStories: NewsStory[]): void {
    this.stories = [...newStories];
  }

  public setCategoriesProvider(newCategories: NewsCategory[]): void {
    this.categories = [...newCategories];
  }

  // ==========================================
  // STORY QUERIES (Async + Sync convenience)
  // ==========================================

  public getStoryBySlugSync(slug: string): NewsStory | null {
    if (!slug) return null;
    const clean = slug.toLowerCase().trim();
    return (
      this.stories.find(
        (s) => s.slug.toLowerCase() === clean || s.id.toLowerCase() === clean
      ) || null
    );
  }

  public async getStoryBySlug(slug: string): Promise<NewsStory | null> {
    return this.getStoryBySlugSync(slug);
  }

  public getStoryByIdSync(id: string): NewsStory | null {
    if (!id) return null;
    return this.stories.find((s) => s.id === id) || null;
  }

  public async getStoryById(id: string): Promise<NewsStory | null> {
    return this.getStoryByIdSync(id);
  }

  public getLatestStoriesSync(limit = 10): NewsStory[] {
    return [...this.stories]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, limit);
  }

  public async getLatestStories(limit = 10): Promise<NewsStory[]> {
    return this.getLatestStoriesSync(limit);
  }

  public getFeaturedStoriesSync(limit = 4): NewsStory[] {
    const featured = this.stories.filter((s) => s.featured);
    if (featured.length > 0) return featured.slice(0, limit);
    return this.getLatestStoriesSync(limit);
  }

  public async getFeaturedStories(limit = 4): Promise<NewsStory[]> {
    return this.getFeaturedStoriesSync(limit);
  }

  public getTrendingStoriesSync(limit = 5): NewsStory[] {
    return [...this.stories]
      .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0))
      .slice(0, limit);
  }

  public async getTrendingStories(limit = 5): Promise<NewsStory[]> {
    return this.getTrendingStoriesSync(limit);
  }

  public getTrendingHeadlinesSync(): { id: string; title: string; category: string; slug: string }[] {
    return this.getTrendingStoriesSync(5).map((s) => ({
      id: s.id,
      title: s.title,
      category: s.category,
      slug: s.slug,
    }));
  }

  public getMostReadStoriesSync(limit = 5): NewsStory[] {
    return [...this.stories]
      .sort((a, b) => {
        if (a.rank && b.rank) return a.rank - b.rank;
        return (b.viewCount || 0) - (a.viewCount || 0);
      })
      .slice(0, limit);
  }

  public async getMostReadStories(limit = 5): Promise<NewsStory[]> {
    return this.getMostReadStoriesSync(limit);
  }

  public getStoriesByCategorySync(
    categorySlug: string,
    options: CategoryStoryQueryOptions = {}
  ): NewsStory[] {
    const { subcategory, sort = 'latest', limit, offset = 0 } = options;
    const cat = categorySlug.toLowerCase().trim();

    let matches = this.stories.filter((s) => {
      const c = s.category.toLowerCase();
      const sub = (s.subcategory || '').toLowerCase();
      if (cat === 'ai') return c.includes('ai') || c.includes('computing') || s.id.startsWith('ai-');
      if (cat === 'technology' || cat === 'tech') return c.includes('tech') || c.includes('semiconductor') || c.includes('hardware') || s.id.startsWith('tech-');
      if (cat === 'gaming') return c.includes('game') || c.includes('gaming') || s.id.startsWith('game-');
      if (cat === 'science') return c.includes('sci') || c.includes('physics') || c.includes('fusion') || s.id.startsWith('sci-');
      if (cat === 'space') return c.includes('space') || c.includes('astrophysics') || sub.includes('aerospace') || s.id.startsWith('space-') || s.id === 'latest-4';
      if (cat === 'business') return c.includes('biz') || c.includes('business') || c.includes('market') || s.id.startsWith('biz-') || s.id === 'latest-5';
      if (cat === 'world') return c.includes('world') || c.includes('trade') || c.includes('diplomacy') || s.id.startsWith('world-') || s.id === 'top-4';
      if (cat === 'hardware') return c.includes('hardware') || sub.includes('hardware') || c.includes('silicon');
      if (cat === 'entertainment') return c.includes('entertainment') || c.includes('culture') || c.includes('media');
      if (cat === 'cybersecurity') return c.includes('security') || c.includes('cyber');
      if (cat === 'apps') return c.includes('apps') || c.includes('software');
      return c.includes(cat);
    });

    if (subcategory && subcategory.toLowerCase() !== 'all') {
      const subQuery = subcategory.toLowerCase().trim();
      matches = matches.filter(
        (s) =>
          s.subcategory?.toLowerCase().includes(subQuery) ||
          s.title.toLowerCase().includes(subQuery) ||
          s.summary.toLowerCase().includes(subQuery)
      );
    }

    if (sort === 'trending') {
      matches = [...matches].sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
    } else if (sort === 'most-read') {
      matches = [...matches].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    } else if (sort === 'featured') {
      matches = [...matches].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    } else {
      matches = [...matches].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    }

    if (typeof limit === 'number') {
      return matches.slice(offset, offset + limit);
    }
    return matches.slice(offset);
  }

  public async getStoriesByCategory(
    categorySlug: string,
    options: CategoryStoryQueryOptions = {}
  ): Promise<NewsStory[]> {
    return this.getStoriesByCategorySync(categorySlug, options);
  }

  public searchStoriesSync(query: string): NewsStory[] {
    if (!query || query.trim() === '') return [];
    const q = query.toLowerCase().trim();
    return this.stories.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.author.name.toLowerCase().includes(q)
    );
  }

  public async searchStories(query: string): Promise<NewsStory[]> {
    return this.searchStoriesSync(query);
  }

  // ==========================================
  // SUB-ENTITY QUERIES
  // ==========================================

  public async getStoryUpdates(storyId: string): Promise<StoryUpdate[]> {
    const story = this.getStoryByIdSync(storyId);
    return story?.updates || [];
  }

  public async getStorySources(storyId: string): Promise<StorySource[]> {
    const story = this.getStoryByIdSync(storyId);
    return story?.sources || [];
  }

  public async getStoryFacts(storyId: string): Promise<Fact[]> {
    const story = this.getStoryByIdSync(storyId);
    return story?.facts || [];
  }

  public async getRelatedStories(storyId: string): Promise<NewsStory[]> {
    const story = this.getStoryByIdSync(storyId);
    if (!story || !story.relatedStoryIds) return [];
    return this.stories.filter((s) => story.relatedStoryIds?.includes(s.id) || story.relatedStoryIds?.includes(s.slug));
  }

  // ==========================================
  // CATEGORY QUERIES
  // ==========================================

  public getCategoryBySlugSync(slug: string): NewsCategory | null {
    if (!slug) return null;
    const clean = slug.toLowerCase().trim();
    if (clean === 'tech') {
      return this.categories.find((c) => c.slug === 'technology') || null;
    }
    return (
      this.categories.find(
        (c) => c.slug.toLowerCase() === clean || c.id.toLowerCase() === clean
      ) || null
    );
  }

  public async getCategoryBySlug(slug: string): Promise<NewsCategory | null> {
    return this.getCategoryBySlugSync(slug);
  }

  public getAllCategoriesSync(): NewsCategory[] {
    return [...this.categories];
  }

  public async getAllCategories(): Promise<NewsCategory[]> {
    return this.getAllCategoriesSync();
  }

  // ==========================================
  // AGGREGATE PAGE PROVIDERS
  // ==========================================

  public getHomepageDataSync(): HomepageData {
    const featuredStory = this.getFeaturedStoriesSync(1)[0] || this.stories[0];
    const latestStories = this.getLatestStoriesSync(5);
    const topStories = this.stories.filter((s) => s.id.startsWith('top-')).slice(0, 4);
    const trendingStories = this.getTrendingStoriesSync(6);
    const mostReadStories = this.getMostReadStoriesSync(5);

    return {
      featuredStory,
      latestStories,
      topStories: topStories.length > 0 ? topStories : this.stories.slice(1, 5),
      trendingStories,
      mostReadStories,
      aiTechStories: this.getStoriesByCategorySync('ai', { limit: 3 }),
      gamingStories: this.getStoriesByCategorySync('gaming', { limit: 3 }),
      scienceStories: this.getStoriesByCategorySync('science', { limit: 3 }),
      businessStories: this.getStoriesByCategorySync('business', { limit: 3 }),
      worldStories: this.getStoriesByCategorySync('world', { limit: 3 }),
    };
  }

  public async getHomepageData(): Promise<HomepageData> {
    return this.getHomepageDataSync();
  }

  public toStory(s: NewsStory): Story {
    return {
      id: s.id,
      slug: s.slug,
      title: s.title,
      summary: s.summary,
      category: s.category,
      subcategory: s.subcategory,
      image: s.image || s.heroImage?.url || '',
      alt: s.alt || s.heroImage?.alt || s.title,
      caption: s.caption || s.heroImage?.caption,
      credit: s.credit || s.heroImage?.credit,
      publishedAt: s.publishedAt,
      updatedAt: s.updatedAt,
      timeDisplay: s.timeDisplay,
      author: {
        name: s.author.name,
        role: s.author.role,
        avatar: s.author.avatar,
      },
      readTime: s.readTime,
      featured: s.featured,
      isLive: s.isLive,
      isBreaking: s.isBreaking,
      rank: s.rank,
    };
  }

  public getCategoryPageDataSync(
    categorySlug: string,
    subcategorySlug?: string,
    sortMode: CategorySortMode = 'latest'
  ): CategoryPageData | null {
    const category = this.getCategoryBySlugSync(categorySlug);
    if (!category) return null;

    const allFiltered = this.getStoriesByCategorySync(categorySlug, {
      subcategory: subcategorySlug,
      sort: sortMode,
    });
    const featured = this.getStoriesByCategorySync(categorySlug, { sort: 'featured', limit: 3 });
    const latest = allFiltered.filter((s) => !featured.slice(0, 1).some((f) => f.id === s.id));
    const trending = this.getStoriesByCategorySync(categorySlug, { sort: 'trending', limit: 5 });
    const mostRead = this.getStoriesByCategorySync(categorySlug, { sort: 'most-read', limit: 5 });

    return {
      category,
      activeSubcategory: subcategorySlug || 'all',
      featuredStories: featured.map((s) => this.toStory(s)),
      latestStories: latest.map((s) => this.toStory(s)),
      trendingStories: trending.map((s) => this.toStory(s)),
      mostReadStories: mostRead.map((s) => this.toStory(s)),
      totalCount: allFiltered.length,
    };
  }

  public async getCategoryPageData(
    categorySlug: string,
    subcategorySlug?: string,
    sortMode: CategorySortMode = 'latest'
  ): Promise<CategoryPageData | null> {
    return this.getCategoryPageDataSync(categorySlug, subcategorySlug, sortMode);
  }
}
