/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { NewsStory } from '../../types/story';
import { StoryBreadcrumb } from './StoryBreadcrumb';
import { StoryMeta } from './StoryMeta';
import { ShareControls } from './ShareControls';

interface StoryHeaderProps {
  story: NewsStory;
  onNavigateHome: () => void;
  onSelectCategory?: (category: string) => void;
  className?: string;
}

export const StoryHeader: React.FC<StoryHeaderProps> = ({
  story,
  onNavigateHome,
  onSelectCategory,
  className = '',
}) => {
  return (
    <header className={`w-full ${className}`}>
      {/* 1. Breadcrumb & Sharing Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-hairline-subtle">
        <StoryBreadcrumb
          category={story.category}
          subcategory={story.subcategory}
          onNavigateHome={onNavigateHome}
          onSelectCategory={onSelectCategory}
        />
        <div className="shrink-0">
          <ShareControls title={story.title} />
        </div>
      </div>

      {/* 2. Category Kicker */}
      <div className="mb-3">
        <span className="text-xs sm:text-sm font-sans font-bold uppercase tracking-widest text-red-900">
          {story.category}
          {story.subcategory && (
            <span className="text-stone-400 font-normal ml-2 tracking-normal">
              / {story.subcategory}
            </span>
          )}
        </span>
      </div>

      {/* 3. Primary Headline (Desktop 52–68px, Mobile 34–42px, Balanced line wrapping) */}
      <h1 className="font-serif text-[32px] sm:text-[44px] md:text-[54px] lg:text-[62px] font-bold text-stone-900 leading-[1.08] tracking-tight mb-5 max-w-5xl [text-wrap:balance]">
        {story.title}
      </h1>

      {/* 4. Editorial Deck / Summary (20-24px, calm and clear) */}
      {(story.dek || story.summary) && (
        <p className="font-sans text-lg sm:text-xl lg:text-[22px] text-stone-600 leading-relaxed max-w-4xl mb-6 font-normal">
          {story.dek || story.summary}
        </p>
      )}

      {/* 5. Story Metadata Bar (Author, Timestamps, Reading Time, Status) */}
      <StoryMeta
        author={story.author}
        publishedAt={story.publishedAt}
        updatedAt={story.updatedAt}
        timeDisplay={story.timeDisplay}
        readTime={story.readTime}
        status={story.status}
      />
    </header>
  );
};
