/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { Story } from '../../data/mockNews';
import { StoryCard } from './StoryCard';

interface RelatedStoriesProps {
  stories?: Story[];
  onSelectStory: (story: Story) => void;
  title?: string;
  className?: string;
}

export const RelatedStories: React.FC<RelatedStoriesProps> = ({
  stories = [],
  onSelectStory,
  title = 'Related Stories',
  className = '',
}) => {
  if (!stories || stories.length === 0) return null;

  return (
    <section aria-label={title} className={`my-12 pt-8 border-t-2 border-stone-900 ${className}`}>
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-hairline">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
          {title}
        </h2>
        <span className="text-[11px] font-sans uppercase font-bold tracking-wider text-red-900">
          Continued Coverage
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {stories.slice(0, 3).map((item) => (
          <StoryCard
            key={item.id}
            story={item}
            variant="standard"
            imageAspectRatio="16:9"
            showSummary={true}
            onSelectStory={onSelectStory}
          />
        ))}
      </div>
    </section>
  );
};
