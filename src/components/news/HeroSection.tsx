/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Radio } from 'lucide-react';
import { StoryCard } from './StoryCard';
import type { Story } from '../../data/mockNews';

interface HeroSectionProps {
  featuredStory: Story;
  latestStories: Story[];
  onSelectStory?: (story: Story) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  featuredStory,
  latestStories,
  onSelectStory,
}) => {
  return (
    <section aria-label="Lead Story and Live Wire" className="w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* LEFT: FEATURED LEAD STORY (7 or 8 columns on desktop) */}
          <div className="lg:col-span-8 border-b lg:border-b-0 lg:border-r border-hairline lg:pr-10 pb-8 lg:pb-0">
            <StoryCard
              story={featuredStory}
              variant="featured"
              imageAspectRatio="16:9"
              showSummary={true}
              onSelectStory={onSelectStory}
            />
          </div>

          {/* RIGHT: LATEST NEWS WIRE (4 columns on desktop) */}
          <div className="lg:col-span-4 flex flex-col">
            {/* Header for Latest News Feed */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b-2 border-stone-900">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" aria-hidden="true" />
                <h2 className="text-xs sm:text-sm font-bold tracking-widest uppercase font-sans text-stone-900">
                  Latest News
                </h2>
              </div>
              <span className="text-[11px] font-sans text-stone-500 font-medium">
                Live Dispatches
              </span>
            </div>

            {/* List of Latest items */}
            <div className="divide-y divide-hairline-subtle" role="feed" aria-label="Latest News Wire">
              {latestStories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  variant="minimal-text"
                  onSelectStory={onSelectStory}
                />
              ))}
            </div>

            {/* View Full Archive link */}
            <div className="pt-4 mt-2 border-t border-hairline flex items-center justify-between text-xs font-sans">
              <span className="text-stone-500">Updated continuously</span>
              <button
                type="button"
                onClick={() => onSelectStory?.(latestStories[0])}
                className="font-semibold text-red-900 hover:text-stone-900 hover:underline flex items-center gap-1"
              >
                <span>Full Wire</span>
                <Radio className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
