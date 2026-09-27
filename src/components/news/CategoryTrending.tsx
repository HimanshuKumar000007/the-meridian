/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TrendingUp, ArrowRight } from 'lucide-react';
import type { Story } from '../../data/mockNews';

interface CategoryTrendingProps {
  stories: Story[];
  onSelectStory: (story: Story) => void;
  className?: string;
}

export const CategoryTrending: React.FC<CategoryTrendingProps> = ({
  stories,
  onSelectStory,
  className = '',
}) => {
  if (!stories || stories.length === 0) return null;

  return (
    <section
      aria-label="Trending in this section"
      className={`bg-white border border-hairline p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${className}`}
    >
      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-hairline">
        <TrendingUp className="w-4 h-4 text-red-900" />
        <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">
          Trending
        </h3>
      </div>

      <ol className="divide-y divide-hairline-subtle">
        {stories.slice(0, 5).map((story, index) => (
          <li
            key={story.id}
            onClick={() => onSelectStory(story)}
            className="py-3 flex items-start gap-3.5 group cursor-pointer"
          >
            <span
              aria-hidden="true"
              className="font-serif text-lg font-bold text-stone-300 group-hover:text-red-900 transition-colors w-6 shrink-0"
            >
              {String(index + 1).padStart(2, '0')}
            </span>

            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-red-900 mb-0.5">
                {story.timeDisplay}
              </div>
              <h4 className="font-serif text-sm font-semibold text-stone-900 group-hover:text-red-950 leading-snug line-clamp-2 transition-colors">
                {story.title}
              </h4>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-red-900 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
          </li>
        ))}
      </ol>
    </section>
  );
};
