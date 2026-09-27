/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StoryCard } from './StoryCard';
import type { Story } from '../../data/mockNews';

interface TopStoriesProps {
  stories: Story[];
  onSelectStory?: (story: Story) => void;
}

export const TopStories: React.FC<TopStoriesProps> = ({ stories, onSelectStory }) => {
  return (
    <section aria-labelledby="top-stories-heading" className="w-full border-t border-b border-hairline py-8 sm:py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="flex items-center justify-between pb-3 mb-6 border-b border-stone-900">
          <h2 id="top-stories-heading" className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
            Top Stories
          </h2>
          <span className="text-xs font-sans text-stone-500 uppercase tracking-wider">
            Curated Global Coverage
          </span>
        </div>

        {/* 4-Card Desktop Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stories.slice(0, 4).map((story, index) => (
            <div
              key={story.id}
              className={`${
                index < stories.length - 1 ? 'sm:border-r sm:border-hairline-subtle sm:pr-6 lg:pr-8' : ''
              }`}
            >
              <StoryCard
                story={story}
                variant="standard"
                imageAspectRatio="16:9"
                showSummary={true}
                onSelectStory={onSelectStory}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
