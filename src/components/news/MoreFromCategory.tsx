/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { Story } from '../../data/mockNews';

interface MoreFromCategoryProps {
  category: string;
  stories: Story[];
  onSelectStory: (story: Story) => void;
  onViewCategory?: (category: string) => void;
  className?: string;
}

export const MoreFromCategory: React.FC<MoreFromCategoryProps> = ({
  category,
  stories,
  onSelectStory,
  onViewCategory,
  className = '',
}) => {
  if (!stories || stories.length === 0) return null;

  return (
    <section
      aria-label={`More from ${category}`}
      className={`bg-white border border-hairline p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${className}`}
    >
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-hairline">
        <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">
          More from {category}
        </h3>
        {onViewCategory && (
          <button
            type="button"
            onClick={() => onViewCategory(category)}
            className="text-[11px] font-sans font-semibold uppercase tracking-wider text-stone-500 hover:text-red-900 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>All</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="divide-y divide-hairline-subtle">
        {stories.slice(0, 4).map((story) => (
          <article
            key={story.id}
            onClick={() => onSelectStory(story)}
            className="py-3 group cursor-pointer"
          >
            <div className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-wider text-red-900 mb-1">
              <span>{story.timeDisplay}</span>
              {story.subcategory && (
                <>
                  <span className="text-stone-300">·</span>
                  <span className="text-stone-500 font-normal">{story.subcategory}</span>
                </>
              )}
            </div>
            <h4 className="font-serif text-sm sm:text-[15px] font-semibold text-stone-900 group-hover:text-red-950 leading-snug transition-colors line-clamp-2">
              {story.title}
            </h4>
            <div className="mt-1 text-[11px] font-sans text-stone-400">
              {story.author.name}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
