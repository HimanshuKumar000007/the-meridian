/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MOCK_STORIES, type Story } from '../mockNews';
import { MOCK_STORIES_DATA } from '../mockStoriesData';
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

interface MockStoryWithMetrics extends Story {
  viewCount: number;
  trendingScore: number;
  status: 'published' | 'draft' | 'archived';
}

interface ViewRecordEvent {
  storyId: string;
  sessionHash: string;
  timestamp: number;
}

function toStory(s: any): Story {
  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    summary: s.summary || s.dek || '',
    category: s.category || 'News',
    subcategory: s.subcategory,
    image: s.image || s.heroImage?.url || '',
    alt: s.alt || s.heroImage?.alt || s.title,
    caption: s.caption || s.heroImage?.caption,
    credit: s.credit || s.heroImage?.credit,
    publishedAt: s.publishedAt || new Date().toISOString(),
    updatedAt: s.updatedAt,
    timeDisplay: s.timeDisplay || 'Recently',
    author: {
      name: s.author?.name || 'The Meridian Staff',
      role: s.author?.role || 'Correspondent',
      avatar: s.author?.avatar,
    },
    readTime: s.readTime || '4 min read',
    featured: Boolean(s.featured),
  };
}

function isTypoMatch(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 2) return false;
  let diff = 0;
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else {
      diff++;
      if (diff > 2) return false;
      if (a.length > b.length) {
        i++;
      } else if (b.length > a.length) {
        j++;
      } else {
        i++;
        j++;
      }
    }
  }
  return diff + (a.length - i) + (b.length - j) <= 2;
}

export class MockSearchRepository implements SearchRepository {
  private stories: MockStoryWithMetrics[];
  private viewEvents: ViewRecordEvent[] = [];

  constructor(customStories?: Story[]) {
    let base: Story[];
    if (customStories) {
      base = customStories;
    } else {
      // Use MOCK_STORIES_DATA enriched with MOCK_STORIES
      const storyMap = new Map<string, Story>();
      MOCK_STORIES_DATA.forEach((s) => storyMap.set(s.slug, toStory(s)));
      MOCK_STORIES.forEach((s) => {
        if (!storyMap.has(s.slug)) storyMap.set(s.slug, s);
      });
      base = Array.from(storyMap.values());
    }

    this.stories = base.map((s, idx) => ({
      ...s,
      viewCount: 100 + (base.length - idx) * 25,
      trendingScore: 50.0 / (idx + 1),
      status: 'published',
    }));
  }

  public setStoryStatus(storyId: string, status: 'published' | 'draft' | 'archived'): void {
    const target = this.stories.find((s) => s.id === storyId);
    if (target) {
      target.status = status;
    }
  }

  public async searchStories(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const rawQuery = (query || '').trim();
    const cleanQuery = rawQuery.toLowerCase().replace(/\s+/g, ' ');
    const noSpaceQuery = cleanQuery.replace(/\s+/g, '');
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const offset = Math.max(options.offset ?? 0, 0);
    const sort = options.sort || 'relevance';

    // Strictly published only
    let eligible = this.stories.filter((s) => s.status === 'published');

    // Filter by category
    if (options.category && options.category.toLowerCase() !== 'all') {
      const cat = options.category.toLowerCase();
      eligible = eligible.filter(
        (s) =>
          s.category.toLowerCase().includes(cat) ||
          (s.subcategory && s.subcategory.toLowerCase().includes(cat))
      );
    }

    if (!cleanQuery) {
      const sorted = [...eligible].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
      const paginated = sorted.slice(offset, offset + limit);
      return {
        results: paginated.map((story) => ({
          story,
          matchScore: 1.0,
          matchReason: 'recent',
          matchedFields: ['publishedAt'],
        })),
        total: eligible.length,
        query: rawQuery,
        options,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(eligible.length / limit),
        hasMore: offset + limit < eligible.length,
      };
    }

    // Rank each story
    const scoredResults: SearchResult[] = [];
    const queryTokens = cleanQuery.split(' ').filter(Boolean);

    for (const story of eligible) {
      const titleLower = story.title.toLowerCase();
      const summaryLower = story.summary.toLowerCase();
      const catLower = story.category.toLowerCase();
      const subcatLower = (story.subcategory || '').toLowerCase();
      const titleNoSpace = titleLower.replace(/\s+/g, '');

      let score = 0;
      const matchedFields: string[] = [];
      let matchReason = '';

      // 1. Exact title match (highest rank)
      if (titleLower === cleanQuery) {
        score += 100;
        matchedFields.push('title');
        matchReason = 'exact_title';
      } else if (titleLower.includes(cleanQuery)) {
        score += 50;
        matchedFields.push('title');
        matchReason = 'title_match';
      } else if (titleNoSpace.includes(noSpaceQuery) && noSpaceQuery.length > 2) {
        score += 35;
        matchedFields.push('title');
        matchReason = 'compound_word_match';
      }

      // 2. Token matching in title
      const matchedTitleTokens = queryTokens.filter((token) => titleLower.includes(token));
      if (matchedTitleTokens.length > 0) {
        score += (matchedTitleTokens.length / queryTokens.length) * 30;
        if (!matchedFields.includes('title')) matchedFields.push('title');
        if (!matchReason) matchReason = 'token_title_match';
      }

      // 3. Phrase match in summary
      if (summaryLower.includes(cleanQuery)) {
        score += 20;
        matchedFields.push('summary');
        if (!matchReason) matchReason = 'summary_phrase_match';
      } else {
        const matchedSummaryTokens = queryTokens.filter((token) => summaryLower.includes(token));
        if (matchedSummaryTokens.length > 0) {
          score += (matchedSummaryTokens.length / queryTokens.length) * 10;
          if (!matchedFields.includes('summary')) matchedFields.push('summary');
          if (!matchReason) matchReason = 'token_summary_match';
        }
      }

      // 4. Category & Subcategory match
      if (catLower.includes(cleanQuery) || subcatLower.includes(cleanQuery)) {
        score += 15;
        matchedFields.push('category');
        if (!matchReason) matchReason = 'category_match';
      }

      // 5. Typo tolerance: Levenshtein distance check on word tokens
      if (score === 0 || matchReason === '') {
        const titleWords = titleLower.split(/\W+/).filter(Boolean);
        for (const qToken of queryTokens) {
          if (qToken.length >= 4) {
            for (const tWord of titleWords) {
              if (isTypoMatch(qToken, tWord)) {
                score += 25;
                if (!matchedFields.includes('title')) matchedFields.push('title');
                matchReason = 'typo_tolerance_match';
                break;
              }
            }
          }
        }
      }

      if (score > 0) {
        scoredResults.push({
          story,
          matchScore: Math.round(score * 100) / 100,
          matchReason: matchReason || 'text_match',
          matchedFields,
        });
      }
    }

    // Sort results
    if (sort === 'latest') {
      scoredResults.sort(
        (a, b) =>
          new Date(b.story.publishedAt).getTime() - new Date(a.story.publishedAt).getTime()
      );
    } else if (sort === 'most_read') {
      const getViews = (s: Story) => (s as unknown as MockStoryWithMetrics).viewCount || 0;
      scoredResults.sort((a, b) => getViews(b.story) - getViews(a.story));
    } else {
      // Relevance
      scoredResults.sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return new Date(b.story.publishedAt).getTime() - new Date(a.story.publishedAt).getTime();
      });
    }

    const paginated = scoredResults.slice(offset, offset + limit);
    return {
      results: paginated,
      total: scoredResults.length,
      query: rawQuery,
      options,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(scoredResults.length / limit) || 1,
      hasMore: offset + limit < scoredResults.length,
    };
  }

  public async getSearchSuggestions(query: string, limit = 6): Promise<SearchSuggestion[]> {
    const clean = (query || '').toLowerCase().trim();
    if (!clean) return [];

    const suggestions: SearchSuggestion[] = [];
    const seen = new Set<string>();

    const published = this.stories.filter((s) => s.status === 'published');

    // 1. Check title matches
    for (const s of published) {
      if (s.title.toLowerCase().includes(clean)) {
        if (!seen.has(s.title)) {
          seen.add(s.title);
          suggestions.push({
            text: s.title,
            type: 'title',
            slug: s.slug,
          });
          if (suggestions.length >= limit) return suggestions;
        }
      }
    }

    // 2. Check category and subcategory matches
    for (const s of published) {
      if (s.category.toLowerCase().includes(clean)) {
        if (!seen.has(s.category)) {
          seen.add(s.category);
          suggestions.push({
            text: s.category,
            type: 'category',
          });
          if (suggestions.length >= limit) return suggestions;
        }
      }
      if (s.subcategory && s.subcategory.toLowerCase().includes(clean)) {
        if (!seen.has(s.subcategory)) {
          seen.add(s.subcategory);
          suggestions.push({
            text: s.subcategory,
            type: 'topic',
          });
          if (suggestions.length >= limit) return suggestions;
        }
      }
    }

    // 3. Check summary keywords
    for (const s of published) {
      if (s.summary.toLowerCase().includes(clean) || s.slug.includes(clean)) {
        if (!seen.has(s.title)) {
          seen.add(s.title);
          suggestions.push({
            text: s.title,
            type: 'title',
            slug: s.slug,
          });
          if (suggestions.length >= limit) return suggestions;
        }
      }
    }

    return suggestions.slice(0, limit);
  }

  public async getTrendingStories(options: TrendingOptions = {}): Promise<Story[]> {
    const limit = Math.min(Math.max(options.limit ?? 5, 1), 20);
    let eligible = this.stories.filter((s) => s.status === 'published');

    if (options.category && options.category.toLowerCase() !== 'all') {
      const cat = options.category.toLowerCase();
      eligible = eligible.filter(
        (s) =>
          s.category.toLowerCase().includes(cat) ||
          (s.subcategory && s.subcategory.toLowerCase().includes(cat))
      );
    }

    // Sort by deterministic trending score descending
    const sorted = [...eligible].sort((a, b) => b.trendingScore - a.trendingScore);
    return sorted.slice(0, limit);
  }

  public async getMostReadStories(options: MostReadOptions = {}): Promise<Story[]> {
    const limit = Math.min(Math.max(options.limit ?? 5, 1), 20);
    let eligible = this.stories.filter((s) => s.status === 'published');

    if (options.category && options.category.toLowerCase() !== 'all') {
      const cat = options.category.toLowerCase();
      eligible = eligible.filter(
        (s) =>
          s.category.toLowerCase().includes(cat) ||
          (s.subcategory && s.subcategory.toLowerCase().includes(cat))
      );
    }

    // Sort by viewCount descending
    const sorted = [...eligible].sort((a, b) => b.viewCount - a.viewCount);
    return sorted.slice(0, limit);
  }

  public async recordStoryView(storyId: string, sessionHash: string): Promise<ViewRecordResult> {
    const story = this.stories.find((s) => s.id === storyId);
    if (!story) {
      return { recorded: false, error: 'story_not_found' };
    }
    if (story.status !== 'published') {
      return { recorded: false, error: 'story_not_published' };
    }

    const now = Date.now();
    const thirtyMinutesMs = 30 * 60 * 1000;

    // Check deduplication
    const recent = this.viewEvents.find(
      (e) =>
        e.storyId === storyId &&
        e.sessionHash === sessionHash &&
        now - e.timestamp < thirtyMinutesMs
    );

    if (recent) {
      return {
        recorded: false,
        reason: 'deduplicated_window',
        viewCount: story.viewCount,
        trendingScore: story.trendingScore,
      };
    }

    this.viewEvents.push({ storyId, sessionHash, timestamp: now });
    story.viewCount += 1;

    // Recalculate trending score: V / (T + 2)^1.5
    const pubTime = new Date(story.publishedAt).getTime();
    const hoursSince = Math.max(0, (now - pubTime) / (1000 * 3600));
    story.trendingScore = Math.round((story.viewCount / Math.pow(hoursSince + 2.0, 1.5)) * 10000) / 10000;

    return {
      recorded: true,
      viewCount: story.viewCount,
      trendingScore: story.trendingScore,
    };
  }

  public async recalculateTrending(): Promise<number> {
    const now = Date.now();
    let updated = 0;
    for (const story of this.stories) {
      if (story.status === 'published') {
        const pubTime = new Date(story.publishedAt).getTime();
        const hoursSince = Math.max(0, (now - pubTime) / (1000 * 3600));
        story.trendingScore =
          Math.round((Math.max(story.viewCount, 1) / Math.pow(hoursSince + 2.0, 1.5)) * 10000) / 10000;
        updated++;
      }
    }
    return updated;
  }
}
