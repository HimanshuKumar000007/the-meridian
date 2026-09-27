/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LayoutGrid, List, ArrowDown } from 'lucide-react';
import type { Story } from '../../data/mockNews';
import type { CategorySortMode, CategoryViewMode } from '../../types/category';
import { StoryCard } from './StoryCard';

interface CategoryStoryListProps {
  categoryName: string;
  stories: Story[];
  sortMode: CategorySortMode;
  onChangeSort: (mode: CategorySortMode) => void;
  onSelectStory: (story: Story) => void;
  className?: string;
}

export const CategoryStoryList: React.FC<CategoryStoryListProps> = ({
  categoryName,
  stories,
  sortMode,
  onChangeSort,
  onSelectStory,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<CategoryViewMode>('grid');
  const [displayCount, setDisplayCount] = useState<number>(6);

  const visibleStories = stories.slice(0, displayCount);
  const hasMore = displayCount < stories.length;

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + 6);
  };

  return (
    <section aria-label={`Latest ${categoryName} Dispatches`} className={className}>
      {/* Editorial Bar: Heading + Sort + View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-hairline">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            Latest {categoryName} Dispatches
          </h2>
          <span className="text-xs font-sans text-stone-500">
            Showing {visibleStories.length} of {stories.length} published stories
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Sorting selector */}
          <div className="flex items-center gap-1 text-xs font-sans text-stone-500 bg-white border border-stone-200 px-2 py-1">
            <span className="text-stone-400">Sort:</span>
            {(['latest', 'trending', 'most-read'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onChangeSort(mode)}
                className={`px-1.5 py-0.5 capitalize transition-colors cursor-pointer ${
                  sortMode === mode
                    ? 'font-bold text-stone-900 border-b border-stone-900'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {mode === 'most-read' ? 'Most Read' : mode}
              </button>
            ))}
          </div>

          {/* Grid / List toggle */}
          <div className="hidden sm:flex items-center border border-stone-200 bg-white">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900'
              }`}
              title="Grid view"
              aria-label="Grid layout"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900'
              }`}
              title="List view"
              aria-label="List layout"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Story Feed (Grid vs List) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {visibleStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              variant="standard"
              imageAspectRatio="16:9"
              showSummary={true}
              onSelectStory={onSelectStory}
            />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-hairline bg-white border border-hairline">
          {visibleStories.map((story) => (
            <div key={story.id} className="p-4 sm:p-6 hover:bg-stone-50/60 transition-colors">
              <StoryCard
                story={story}
                variant="horizontal"
                imageAspectRatio="16:9"
                showSummary={true}
                onSelectStory={onSelectStory}
              />
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && (
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={handleLoadMore}
            className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white font-sans text-xs uppercase font-semibold tracking-wider transition-colors cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Load More Stories</span>
          </button>
        </div>
      )}
    </section>
  );
};
