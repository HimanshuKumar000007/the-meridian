/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NewsStory, StorySource, StoryUpdate, Fact } from '../../types/story';
import type { NewsCategory, CategorySortMode, CategoryPageData } from '../../types/category';
import type { NewsRepository, HomepageData, CategoryStoryQueryOptions } from '../../types/repository';
import type { Story, TrendingItem } from '../mockNews';
import { getSupabaseClient } from '../../lib/supabase';
import { mapDatabaseStoryToNewsStory, type DatabaseStoryRow } from '../mappers/storyMapper';
import { CATEGORY_DEFINITIONS } from '../categoryDatabase';
import { MOCK_STORIES_DATA } from '../mockStoriesData';

export class SupabaseNewsRepository implements NewsRepository {
  private client: SupabaseClient;
  private categoriesCache: NewsCategory[] = [...CATEGORY_DEFINITIONS];
  private categoriesLoaded = false;
  private storiesCache: NewsStory[] = [...MOCK_STORIES_DATA];

  constructor(client?: SupabaseClient) {
    this.client = client || getSupabaseClient();
    // Warm up categories cache from Supabase asynchronously
    this.getAllCategories().catch(() => {});
  }

  // ==========================================
  // SYNCHRONOUS CONVENIENCE / CACHE ACCESS
  // ==========================================

  public getCategoryBySlugSync(slug: string): NewsCategory | null {
    if (!slug) return null;
    const clean = slug.toLowerCase().trim();
    const resolvedSlug = clean === 'tech' ? 'technology' : clean;
    return (
      this.categoriesCache.find((c) => c.slug === resolvedSlug || c.id === resolvedSlug) || null
    );
  }

  public getAllCategoriesSync(): NewsCategory[] {
    return this.categoriesCache;
  }

  public getTrendingHeadlinesSync(): TrendingItem[] {
    return this.storiesCache.slice(0, 5).map((s) => ({
      id: s.id,
      title: s.title,
      category: s.category,
      slug: s.slug,
    }));
  }

  public getStoryBySlugSync(slug: string): NewsStory | null {
    if (!slug) return null;
    const clean = slug.toLowerCase().trim();
    return (
      this.storiesCache.find(
        (s) => s.slug.toLowerCase() === clean || s.id.toLowerCase() === clean
      ) || null
    );
  }

  public getLatestStoriesSync(limit = 10): NewsStory[] {
    return this.storiesCache.slice(0, limit);
  }

  public getHomepageDataSync(): HomepageData {
    const all = this.storiesCache;
    const featuredStory = all.find((s) => s.featured) || all[0];
    const latestStories = all.slice(0, 5);
    const topStories = all.slice(1, 5);
    const trendingStories = [...all].sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0)).slice(0, 5);
    const mostReadStories = [...all].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 5);

    const filterByCat = (catPattern: string) =>
      all.filter((s) => s.category.toLowerCase().includes(catPattern)).slice(0, 3);

    return {
      featuredStory,
      latestStories,
      topStories,
      trendingStories,
      mostReadStories,
      aiTechStories: filterByCat('ai').length > 0 ? filterByCat('ai') : all.slice(0, 3),
      gamingStories: filterByCat('gaming').length > 0 ? filterByCat('gaming') : all.slice(3, 6),
      scienceStories: filterByCat('science').length > 0 ? filterByCat('science') : all.slice(6, 9),
      businessStories: filterByCat('business').length > 0 ? filterByCat('business') : all.slice(9, 12),
      worldStories: filterByCat('world').length > 0 ? filterByCat('world') : all.slice(12, 15),
    };
  }

  // ==========================================
  // STORY QUERIES
  // ==========================================

  public async getStoryBySlug(slug: string): Promise<NewsStory | null> {
    if (!slug) return null;
    const cleanSlug = slug.toLowerCase().trim();

    try {
      const { data, error } = await this.client
        .from('stories')
        .select(`
          *,
          author:authors(*),
          category:categories(*),
          subcategory:subcategories(*),
          sources:story_sources(*),
          updates:story_updates(*),
          facts:story_facts(*),
          corrections:story_corrections(*),
          relationships:story_relationships!story_id(*)
        `)
        .eq('slug', cleanSlug)
        .eq('status', 'published')
        .maybeSingle();

      if (error || !data) {
        if (error) console.error('[SupabaseNewsRepository] getStoryBySlug error:', error.message);
        return null;
      }

      return mapDatabaseStoryToNewsStory(data as DatabaseStoryRow);
    } catch (err) {
      console.error('[SupabaseNewsRepository] getStoryBySlug exception:', err);
      return null;
    }
  }

  public async getStoryById(id: string): Promise<NewsStory | null> {
    if (!id) return null;

    try {
      const { data, error } = await this.client
        .from('stories')
        .select(`
          *,
          author:authors(*),
          category:categories(*),
          subcategory:subcategories(*),
          sources:story_sources(*),
          updates:story_updates(*),
          facts:story_facts(*),
          corrections:story_corrections(*),
          relationships:story_relationships!story_id(*)
        `)
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle();

      if (error || !data) return null;
      return mapDatabaseStoryToNewsStory(data as DatabaseStoryRow);
    } catch {
      return null;
    }
  }

  public async getLatestStories(limit = 10): Promise<NewsStory[]> {
    try {
      const { data, error } = await this.client
        .from('stories')
        .select(`
          *,
          author:authors(*),
          category:categories(*),
          subcategory:subcategories(*)
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data.map((row) => mapDatabaseStoryToNewsStory(row as DatabaseStoryRow));
    } catch {
      return [];
    }
  }

  public async getFeaturedStories(limit = 4): Promise<NewsStory[]> {
    try {
      const { data, error } = await this.client
        .from('stories')
        .select(`
          *,
          author:authors(*),
          category:categories(*),
          subcategory:subcategories(*)
        `)
        .eq('status', 'published')
        .eq('is_featured', true)
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error || !data || data.length === 0) {
        // Fallback to latest stories if none explicitly marked featured
        return this.getLatestStories(limit);
      }
      return data.map((row) => mapDatabaseStoryToNewsStory(row as DatabaseStoryRow));
    } catch {
      return [];
    }
  }

  public async getTrendingStories(limit = 5): Promise<NewsStory[]> {
    try {
      const { data, error } = await this.client
        .from('stories')
        .select(`
          *,
          author:authors(*),
          category:categories(*),
          subcategory:subcategories(*)
        `)
        .eq('status', 'published')
        .order('trending_score', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data.map((row) => mapDatabaseStoryToNewsStory(row as DatabaseStoryRow));
    } catch {
      return [];
    }
  }

  public async getMostReadStories(limit = 5): Promise<NewsStory[]> {
    try {
      const { data, error } = await this.client
        .from('stories')
        .select(`
          *,
          author:authors(*),
          category:categories(*),
          subcategory:subcategories(*)
        `)
        .eq('status', 'published')
        .order('view_count', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data.map((row) => mapDatabaseStoryToNewsStory(row as DatabaseStoryRow));
    } catch {
      return [];
    }
  }

  public async getStoriesByCategory(
    categorySlug: string,
    options: CategoryStoryQueryOptions = {}
  ): Promise<NewsStory[]> {
    const { subcategory, sort = 'latest', limit = 20, offset = 0 } = options;
    const cat = await this.getCategoryBySlug(categorySlug);
    if (!cat) return [];

    try {
      const catId = cat.id.startsWith('cat-') ? cat.id : `cat-${cat.slug === 'technology' ? 'tech' : cat.slug === 'cybersecurity' ? 'cyber' : cat.slug}`;
      let query = this.client
        .from('stories')
        .select(`
          *,
          author:authors(*),
          category:categories(*),
          subcategory:subcategories(*)
        `)
        .or(`category_id.eq.${cat.id},category_id.eq.${catId}`)
        .eq('status', 'published');

      if (subcategory && subcategory.toLowerCase() !== 'all') {
        const subcat = cat.subcategories?.find((s) => s.slug === subcategory);
        if (subcat) {
          const subId = subcat.id.startsWith('sub-') ? subcat.id : `sub-${cat.slug}-${subcat.slug}`;
          query = query.or(`subcategory_id.eq.${subcat.id},subcategory_id.eq.${subId}`);
        }
      }

      if (sort === 'trending') {
        query = query.order('trending_score', { ascending: false });
      } else if (sort === 'most-read') {
        query = query.order('view_count', { ascending: false });
      } else if (sort === 'featured') {
        query = query.order('is_featured', { ascending: false }).order('published_at', { ascending: false });
      } else {
        query = query.order('published_at', { ascending: false });
      }

      if (typeof limit === 'number') {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error } = await query;
      if (error || !data) return [];
      return data.map((row) => mapDatabaseStoryToNewsStory(row as DatabaseStoryRow));
    } catch {
      return [];
    }
  }

  public async searchStories(queryText: string): Promise<NewsStory[]> {
    if (!queryText || queryText.trim() === '') return [];
    const q = queryText.toLowerCase().trim();

    try {
      const { data, error } = await this.client
        .from('stories')
        .select(`
          *,
          author:authors(*),
          category:categories(*),
          subcategory:subcategories(*)
        `)
        .eq('status', 'published')
        .or(`title.ilike.%${q}%,summary.ilike.%${q}%,slug.ilike.%${q}%`)
        .order('published_at', { ascending: false })
        .limit(15);

      if (error || !data) return [];
      return data.map((row) => mapDatabaseStoryToNewsStory(row as DatabaseStoryRow));
    } catch {
      return [];
    }
  }

  // ==========================================
  // SUB-ENTITY QUERIES
  // ==========================================

  public async getStoryUpdates(storyId: string): Promise<StoryUpdate[]> {
    try {
      const { data, error } = await this.client
        .from('story_updates')
        .select('*')
        .eq('story_id', storyId)
        .order('timestamp', { ascending: false });

      if (error || !data) return [];
      return data.map((u) => ({
        id: u.id,
        timestamp: u.timestamp,
        time: new Date(u.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        title: u.title || undefined,
        body: u.body,
        text: u.body,
        isMajor: Boolean(u.is_major),
      }));
    } catch {
      return [];
    }
  }

  public async getStorySources(storyId: string): Promise<StorySource[]> {
    try {
      const { data, error } = await this.client
        .from('story_sources')
        .select('*')
        .eq('story_id', storyId)
        .order('display_order', { ascending: true });

      if (error || !data) return [];
      return data.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url || undefined,
        sourceType: s.source_type,
        publishedAt: s.published_at || undefined,
        accessedAt: s.accessed_at || undefined,
        author: s.author || undefined,
        isPrimary: Boolean(s.is_primary),
      }));
    } catch {
      return [];
    }
  }

  public async getStoryFacts(storyId: string): Promise<Fact[]> {
    try {
      const { data, error } = await this.client
        .from('story_facts')
        .select('*')
        .eq('story_id', storyId)
        .order('display_order', { ascending: true });

      if (error || !data) return [];
      return data.map((f, i) => ({
        id: f.id,
        label: f.label,
        value: f.value,
        order: f.display_order ?? i + 1,
      }));
    } catch {
      return [];
    }
  }

  public async getRelatedStories(storyId: string): Promise<NewsStory[]> {
    try {
      const { data: rels, error: relError } = await this.client
        .from('story_relationships')
        .select('related_story_id')
        .eq('story_id', storyId);

      if (relError || !rels || rels.length === 0) return [];
      const relatedIds = rels.map((r) => r.related_story_id);

      const { data: stories, error: storyError } = await this.client
        .from('stories')
        .select(`
          *,
          author:authors(*),
          category:categories(*),
          subcategory:subcategories(*)
        `)
        .in('id', relatedIds)
        .eq('status', 'published');

      if (storyError || !stories) return [];
      return stories.map((row) => mapDatabaseStoryToNewsStory(row as DatabaseStoryRow));
    } catch {
      return [];
    }
  }

  // ==========================================
  // CATEGORY QUERIES
  // ==========================================

  public async getAllCategories(): Promise<NewsCategory[]> {
    if (this.categoriesLoaded && this.categoriesCache.length > 0) {
      return this.categoriesCache;
    }

    try {
      const { data, error } = await this.client
        .from('categories')
        .select(`
          *,
          subcategories(*)
        `)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error || !data || data.length === 0) {
        return this.categoriesCache;
      }

      this.categoriesCache = data.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        displayName: row.display_name || row.name,
        shortName: row.name,
        description: row.description,
        isActive: row.is_active,
        displayOrder: row.display_order,
        subcategories: (row.subcategories || []).map((sub: any) => ({
          id: sub.id,
          slug: sub.slug,
          name: sub.name,
          description: sub.description || undefined,
          categorySlug: row.slug,
          isActive: sub.is_active,
          displayOrder: sub.display_order,
        })),
      }));

      this.categoriesLoaded = true;
      return this.categoriesCache;
    } catch {
      return this.categoriesCache;
    }
  }

  public async getCategoryBySlug(slug: string): Promise<NewsCategory | null> {
    if (!slug) return null;
    const clean = slug.toLowerCase().trim();
    const resolvedSlug = clean === 'tech' ? 'technology' : clean;

    const categories = await this.getAllCategories();
    return categories.find((c) => c.slug === resolvedSlug || c.id === resolvedSlug) || null;
  }

  // ==========================================
  // AGGREGATE PAGE PROVIDERS (Batch Performance)
  // ==========================================

  public async getHomepageData(): Promise<HomepageData> {
    try {
      // Single query fetching latest 30 published stories with authors and categories
      const { data, error } = await this.client
        .from('stories')
        .select(`
          *,
          author:authors(*),
          category:categories(*),
          subcategory:subcategories(*)
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(30);

      const allStories: NewsStory[] = error || !data
        ? []
        : data.map((row) => mapDatabaseStoryToNewsStory(row as DatabaseStoryRow));

      if (allStories.length === 0) {
        throw new Error('No published stories found in database');
      }

      this.storiesCache = allStories;

      const featuredStory = allStories.find((s) => s.featured) || allStories[0];
      const latestStories = allStories.slice(0, 5);
      const topStories = allStories.slice(1, 5);
      const trendingStories = [...allStories].sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0)).slice(0, 5);
      const mostReadStories = [...allStories].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 5);

      const filterByCat = (catPattern: string) =>
        allStories.filter((s) => s.category.toLowerCase().includes(catPattern)).slice(0, 3);

      return {
        featuredStory,
        latestStories,
        topStories,
        trendingStories,
        mostReadStories,
        aiTechStories: filterByCat('ai').length > 0 ? filterByCat('ai') : allStories.slice(0, 3),
        gamingStories: filterByCat('gaming').length > 0 ? filterByCat('gaming') : allStories.slice(3, 6),
        scienceStories: filterByCat('science').length > 0 ? filterByCat('science') : allStories.slice(6, 9),
        businessStories: filterByCat('business').length > 0 ? filterByCat('business') : allStories.slice(9, 12),
        worldStories: filterByCat('world').length > 0 ? filterByCat('world') : allStories.slice(12, 15),
      };
    } catch (err) {
      console.error('[SupabaseNewsRepository] getHomepageData error:', err);
      throw err;
    }
  }

  private toStory(s: NewsStory): Story {
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

  public async getCategoryPageData(
    categorySlug: string,
    subcategorySlug?: string,
    sortMode: CategorySortMode = 'latest'
  ): Promise<CategoryPageData | null> {
    const category = await this.getCategoryBySlug(categorySlug);
    if (!category) return null;

    try {
      const allFiltered = await this.getStoriesByCategory(categorySlug, {
        subcategory: subcategorySlug,
        sort: sortMode,
        limit: 30,
      });

      const featured = await this.getStoriesByCategory(categorySlug, { sort: 'featured', limit: 3 });
      const latest = allFiltered.filter((s) => !featured.slice(0, 1).some((f) => f.id === s.id));
      const trending = await this.getStoriesByCategory(categorySlug, { sort: 'trending', limit: 5 });
      const mostRead = await this.getStoriesByCategory(categorySlug, { sort: 'most-read', limit: 5 });

      return {
        category,
        activeSubcategory: subcategorySlug || 'all',
        featuredStories: featured.map((s) => this.toStory(s)),
        latestStories: latest.map((s) => this.toStory(s)),
        trendingStories: trending.map((s) => this.toStory(s)),
        mostReadStories: mostRead.map((s) => this.toStory(s)),
        totalCount: allFiltered.length,
      };
    } catch {
      return null;
    }
  }
}
