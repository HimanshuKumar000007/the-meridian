/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { Story } from '../../data/mockNews';

interface MostReadProps {
  stories: Story[];
  onSelectStory?: (story: Story) => void;
}

export const MostRead: React.FC<MostReadProps> = ({ stories, onSelectStory }) => {
  return (
    <section aria-labelledby="most-read-heading" className="w-full py-8 sm:py-10 border-b border-hairline bg-[#F8F7F3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pb-3 mb-6 border-b-2 border-stone-900 flex items-center justify-between">
          <h2 id="most-read-heading" className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            Most Read
          </h2>
          <span className="text-xs font-sans text-stone-500 uppercase tracking-wider">
            Past 24 Hours
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 lg:gap-8">
          {stories.slice(0, 5).map((story, index) => {
            const formattedRank = String(index + 1).padStart(2, '0');
            return (
              <article
                key={story.id}
                onClick={() => onSelectStory?.(story)}
                className={`group cursor-pointer flex flex-col justify-start focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 ${
                  index < 4 ? 'md:border-r md:border-hairline-subtle md:pr-6' : ''
                }`}
                tabIndex={0}
                role="button"
                aria-label={`Rank ${index + 1}: ${story.title}`}
              >
                {/* Subtle, dignified rank number */}
                <div className="font-serif text-3xl font-light text-stone-400 group-hover:text-red-900 transition-colors mb-2 tabular-nums">
                  {formattedRank}
                </div>

                <div className="text-[11px] font-sans font-semibold uppercase tracking-wider text-red-900 mb-1.5">
                  {story.category}
                </div>

                <h3 className="font-serif text-base sm:text-lg font-semibold text-stone-900 group-hover:text-red-950 transition-colors leading-snug mb-2 [text-wrap:balance]">
                  {story.title}
                </h3>

                <div className="mt-auto pt-2 text-[11px] font-sans text-stone-500">
                  <span>{story.readTime}</span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
