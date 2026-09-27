/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, SlidersHorizontal, Sparkles, TrendingUp, Flame, ArrowLeft, ArrowRight } from 'lucide-react';
import type { Story, TrendingItem, NewsStory } from '../../data/mockNews';
import { StoryCard } from './StoryCard';
import { newsRepository } from '../../data/newsRepository';
import { SupabaseSearchRepository } from '../../data/repositories/SupabaseSearchRepository';
import { MockSearchRepository } from '../../data/repositories/MockSearchRepository';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { SearchResponse, SearchResult, SearchSortOption } from '../../types/search';

interface SearchPageProps {
  initialQuery?: string;
  initialCategory?: string;
  onNavigateHome: () => void;
  onSelectCategory: (categorySlug: string) => void;
  onSelectStory: (story: Story | NewsStory) => void;
  onOpenSearchModal: () => void;
  trendingItems?: TrendingItem[];
}

const SEARCH_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'ai', label: 'AI' },
  { id: 'tech', label: 'Tech' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'science', label: 'Science' },
  { id: 'space', label: 'Space' },
  { id: 'business', label: 'Business' },
  { id: 'world', label: 'World' },
];

export const SearchPage: React.FC<SearchPageProps> = ({
  initialQuery = '',
  initialCategory = 'all',
  onNavigateHome,
  onSelectCategory,
  onSelectStory,
  onOpenSearchModal,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [activeSort, setActiveSort] = useState<SearchSortOption>('relevance');
  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  const [isLoading, setIsLoading] = useState(true);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [trendingStories, setTrendingStories] = useState<Story[]>([]);
  const [mostReadStories, setMostReadStories] = useState<Story[]>([]);

  // Select appropriate repository
  const searchRepo = useMemo(() => {
    try {
      if (isSupabaseConfigured()) {
        return new SupabaseSearchRepository();
      }
    } catch {
      // Fallback
    }
    return new MockSearchRepository();
  }, []);

  // Update query when initialQuery prop changes (e.g. browser navigation)
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Enforce noindex, follow on internal search results per Google Search Central guidance
  useEffect(() => {
    const originalTitle = document.title;
    document.title = query ? `Search: ${query} — The Meridian` : `Search — The Meridian`;

    let robotsMeta = document.querySelector('meta[name="robots"]');
    const createdRobots = !robotsMeta;
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    const prevRobots = robotsMeta.getAttribute('content');
    robotsMeta.setAttribute('content', 'noindex, follow');

    return () => {
      document.title = originalTitle;
      if (createdRobots) {
        robotsMeta?.remove();
      } else if (prevRobots) {
        robotsMeta?.setAttribute('content', prevRobots);
      } else {
        robotsMeta?.removeAttribute('content');
      }
    };
  }, [query]);

  // Execute search
  const executeSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const offset = (page - 1) * limit;
      const res = await searchRepo.searchStories(query, {
        category: activeCategory === 'all' ? undefined : activeCategory,
        sort: activeSort,
        limit,
        offset,
      });
      setSearchResponse(res);
    } catch (err) {
      console.error('[SearchPage] search error:', err);
      setSearchResponse(null);
    } finally {
      setIsLoading(false);
    }
  }, [searchRepo, query, activeCategory, activeSort, page, limit]);

  // Load trending and most-read stories for sidebar
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      searchRepo.getTrendingStories({ limit: 5 }),
      searchRepo.getMostReadStories({ limit: 5 }),
    ])
      .then(([trending, mostRead]) => {
        if (isMounted) {
          setTrendingStories(trending);
          setMostReadStories(mostRead);
        }
      })
      .catch((err) => console.error('[SearchPage] sidebar data error:', err));

    return () => {
      isMounted = false;
    };
  }, [searchRepo]);

  // Trigger search on parameter changes
  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const newUrl = `/search?q=${encodeURIComponent(query)}${activeCategory !== 'all' ? `&category=${activeCategory}` : ''}`;
    window.history.pushState(null, '', newUrl);
    executeSearch();
  };

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
    setPage(1);
    const newUrl = `/search?q=${encodeURIComponent(query)}${catId !== 'all' ? `&category=${catId}` : ''}`;
    window.history.pushState(null, '', newUrl);
  };

  const handleSortChange = (newSort: SearchSortOption) => {
    setActiveSort(newSort);
    setPage(1);
  };

  const results = searchResponse?.results || [];
  const total = searchResponse?.total || 0;
  const totalPages = searchResponse?.totalPages || 1;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 flex flex-col font-sans">
      {/* Breadcrumb & Navigation */}
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNavigateHome}
              className="hover:text-stone-900 transition-colors uppercase font-medium tracking-wider"
            >
              The Meridian
            </button>
            <span>/</span>
            <span className="text-stone-900 font-medium uppercase tracking-wider">Search</span>
            {query && (
              <>
                <span>/</span>
                <span className="text-stone-600 truncate max-w-[200px]">&ldquo;{query}&rdquo;</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-1 text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Front Page</span>
          </button>
        </div>
      </div>

      {/* Main Search Banner */}
      <div className="border-b border-stone-200 bg-white shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <form onSubmit={handleFormSubmit} className="max-w-3xl">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-6 h-6 text-stone-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reporting, analysis, investigations..."
                className="w-full pl-13 pr-28 py-3.5 bg-stone-50 border border-stone-300 focus:border-stone-900 focus:bg-white text-lg sm:text-xl font-serif text-stone-900 placeholder:text-stone-400 transition-all outline-none"
              />
              <button
                type="submit"
                className="absolute right-2 px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-sans font-medium tracking-wide uppercase transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Category Filters & Sort Controls */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-100">
            {/* Category pills */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs uppercase font-semibold tracking-wider text-stone-400 mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" /> Filter:
              </span>
              {SEARCH_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`px-3 py-1 text-xs font-sans tracking-wide transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-stone-900 text-white font-medium'
                      : 'bg-white border border-stone-200 text-stone-700 hover:border-stone-400'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sort options */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-400 uppercase font-semibold tracking-wider">Sort:</span>
              <div className="inline-flex border border-stone-200 bg-white">
                <button
                  type="button"
                  onClick={() => handleSortChange('relevance')}
                  className={`px-3 py-1 transition-colors ${
                    activeSort === 'relevance'
                      ? 'bg-stone-100 font-semibold text-stone-900'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Relevance
                </button>
                <button
                  type="button"
                  onClick={() => handleSortChange('latest')}
                  className={`px-3 py-1 border-l border-stone-200 transition-colors ${
                    activeSort === 'latest'
                      ? 'bg-stone-100 font-semibold text-stone-900'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Latest
                </button>
                <button
                  type="button"
                  onClick={() => handleSortChange('most_read')}
                  className={`px-3 py-1 border-l border-stone-200 transition-colors ${
                    activeSort === 'most_read'
                      ? 'bg-stone-100 font-semibold text-stone-900'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Most Read
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Results Metadata */}
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-stone-200 text-xs font-sans text-stone-500">
          <div>
            {isLoading ? (
              <span>Searching archive...</span>
            ) : query.trim() ? (
              <span>
                Found <strong className="text-stone-900 font-semibold">{total}</strong> {total === 1 ? 'story' : 'stories'} for &ldquo;<strong className="text-stone-900">{query}</strong>&rdquo;
              </span>
            ) : (
              <span>Showing all published reports ({total})</span>
            )}
          </div>
          {totalPages > 1 && (
            <span>
              Page {page} of {totalPages}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Results Column */}
          <div className="lg:col-span-8">
            {isLoading ? (
              <div className="py-20 text-center text-stone-400">
                <div className="inline-block animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full mb-3" />
                <p className="font-serif text-stone-600">Retrieving reports...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-6">
                {results.map(({ story, matchReason }) => (
                  <div
                    key={story.id}
                    className="p-4 sm:p-5 bg-white border border-stone-200 hover:border-stone-400 transition-all shadow-xs group"
                  >
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-red-900 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{story.category}</span>
                        {story.subcategory && (
                          <>
                            <span className="text-stone-300">/</span>
                            <span className="text-stone-500 font-normal">{story.subcategory}</span>
                          </>
                        )}
                        <span className="text-stone-300">·</span>
                        <span className="text-stone-500 font-normal">{story.timeDisplay}</span>
                      </div>
                      {matchReason === 'exact_title' && (
                        <span className="text-[10px] font-sans font-medium px-1.5 py-0.5 bg-amber-100 text-amber-800">
                          Exact Match
                        </span>
                      )}
                    </div>

                    <h3
                      onClick={() => onSelectStory(story)}
                      className="font-serif text-xl sm:text-2xl font-bold text-stone-900 group-hover:text-red-900 leading-snug cursor-pointer transition-colors mb-2"
                    >
                      {story.title}
                    </h3>

                    <p className="text-sm sm:text-base text-stone-600 font-sans leading-relaxed line-clamp-3 mb-3">
                      {story.summary}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs text-stone-500 font-sans">
                      <div className="flex items-center gap-2">
                        <span>By {story.author.name}</span>
                        {story.readTime && <span>· {story.readTime}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectStory(story)}
                        className="text-stone-900 font-semibold group-hover:text-red-900 flex items-center gap-1 transition-colors"
                      >
                        Read Report <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-6 border-t border-stone-200">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      className="px-4 py-2 border border-stone-300 text-xs font-semibold uppercase tracking-wider text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 transition-colors flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Previous
                    </button>
                    <span className="text-xs text-stone-500 font-sans">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                      className="px-4 py-2 border border-stone-300 text-xs font-semibold uppercase tracking-wider text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 transition-colors flex items-center gap-1.5"
                    >
                      Next <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Empty State */
              <div className="p-8 sm:p-12 bg-white border border-stone-200 text-center">
                <Search className="w-10 h-10 text-stone-300 mx-auto mb-4" />
                <h3 className="font-serif text-2xl font-bold text-stone-900 mb-2">
                  No stories found for &ldquo;{query}&rdquo;
                </h3>
                <p className="text-sm text-stone-500 font-sans max-w-md mx-auto mb-6">
                  We couldn&rsquo;t find any published reports matching your query. Try searching for different keywords, checking spelling, or browsing by category.
                </p>

                <div className="pt-6 border-t border-stone-100">
                  <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
                    Explore Categories
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SEARCH_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleCategoryChange(c.id)}
                        className="px-3 py-1.5 text-xs font-sans font-medium text-stone-700 bg-stone-50 border border-stone-200 hover:border-stone-900 hover:text-stone-900 transition-colors"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Real Trending & Most Read */}
          <div className="lg:col-span-4 space-y-8">
            {/* Trending Section */}
            <div className="p-5 bg-white border border-stone-200 shadow-xs">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-stone-200 text-xs uppercase font-bold tracking-wider text-red-900">
                <Flame className="w-4 h-4 text-red-700" />
                <span>Trending Reports</span>
              </div>
              {trendingStories.length > 0 ? (
                <div className="space-y-4">
                  {trendingStories.map((story, idx) => (
                    <div
                      key={story.id}
                      onClick={() => onSelectStory(story)}
                      className="group cursor-pointer flex items-start gap-3"
                    >
                      <span className="font-serif text-xl font-bold text-stone-300 group-hover:text-red-900 shrink-0 w-6">
                        0{idx + 1}
                      </span>
                      <div>
                        <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-stone-400 mb-0.5">
                          {story.category}
                        </div>
                        <h4 className="font-serif text-sm font-semibold text-stone-900 group-hover:text-red-900 leading-snug line-clamp-2 transition-colors">
                          {story.title}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 font-sans">No trending reports available.</p>
              )}
            </div>

            {/* Most Read Section */}
            <div className="p-5 bg-white border border-stone-200 shadow-xs">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-stone-200 text-xs uppercase font-bold tracking-wider text-stone-900">
                <TrendingUp className="w-4 h-4 text-stone-600" />
                <span>Most Read</span>
              </div>
              {mostReadStories.length > 0 ? (
                <div className="space-y-4">
                  {mostReadStories.map((story, idx) => (
                    <div
                      key={story.id}
                      onClick={() => onSelectStory(story)}
                      className="group cursor-pointer flex items-start gap-3"
                    >
                      <span className="font-serif text-xl font-bold text-stone-400 group-hover:text-stone-900 shrink-0 w-6">
                        0{idx + 1}
                      </span>
                      <div>
                        <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-stone-400 mb-0.5">
                          {story.category}
                        </div>
                        <h4 className="font-serif text-sm font-semibold text-stone-900 group-hover:text-red-900 leading-snug line-clamp-2 transition-colors">
                          {story.title}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 font-sans">No most read reports available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
