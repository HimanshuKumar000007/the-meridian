/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { Story } from '../../data/mockNews';
import { StoryCard } from './StoryCard';

interface CategoryFeaturedProps {
  stories: Story[];
  onSelectStory: (story: Story) => void;
  className?: string;
}

export const CategoryFeatured: React.FC<CategoryFeaturedProps> = ({
  stories,
  onSelectStory,
  className = '',
}) => {
  if (!stories || stories.length === 0) return null;

  const leadStory = stories[0];
  const secondaryStories = stories.slice(1, 4);

  // If only 1 story exists in the category
  if (stories.length === 1) {
    return (
      <section aria-label="Featured Story" className={`mb-12 pb-10 border-b border-hairline ${className}`}>
        <div className="max-w-4xl mx-auto">
          <StoryCard
            story={leadStory}
            variant="featured"
            imageAspectRatio="16:9"
            showSummary={true}
            onSelectStory={onSelectStory}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Featured Stories"
      className={`mb-12 pb-10 border-b-2 border-stone-900 ${className}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        {/* Left: Primary Lead Story (7 or 8 cols on desktop) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <StoryCard
            story={leadStory}
            variant="featured"
            imageAspectRatio="16:9"
            showSummary={true}
            onSelectStory={onSelectStory}
          />
        </div>

        {/* Right: Secondary Stories Stack (5 or 4 cols on desktop) */}
        {secondaryStories.length > 0 && (
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col divide-y divide-hairline justify-between">
            {secondaryStories.map((story) => (
              <div key={story.id} className="py-4 first:pt-0 last:pb-0">
                <StoryCard
                  story={story}
                  variant="horizontal"
                  imageAspectRatio="1:1"
                  showSummary={true}
                  onSelectStory={onSelectStory}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
