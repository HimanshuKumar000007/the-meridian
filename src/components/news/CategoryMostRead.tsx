/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Flame } from 'lucide-react';
import type { Story } from '../../data/mockNews';

interface CategoryMostReadProps {
  stories: Story[];
  onSelectStory: (story: Story) => void;
  className?: string;
}

export const CategoryMostRead: React.FC<CategoryMostReadProps> = ({
  stories,
  onSelectStory,
  className = '',
}) => {
  if (!stories || stories.length === 0) return null;

  return (
    <section
      aria-label="Most read in this section"
      className={`bg-white border border-hairline p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${className}`}
    >
      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-hairline">
        <Flame className="w-4 h-4 text-stone-700" />
        <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">
          Most Read
        </h3>
      </div>

      <ol className="divide-y divide-hairline-subtle">
        {stories.slice(0, 5).map((story, index) => (
          <li
            key={story.id}
            onClick={() => onSelectStory(story)}
            className="py-3 flex items-start gap-3 group cursor-pointer"
          >
            <span
              aria-hidden="true"
              className="font-serif text-xl font-bold text-stone-400 group-hover:text-stone-900 transition-colors w-6 shrink-0"
            >
              {String(index + 1).padStart(2, '0')}
            </span>

            <div className="flex-1 min-w-0">
              <h4 className="font-serif text-sm font-semibold text-stone-900 group-hover:text-red-950 leading-snug line-clamp-2 transition-colors">
                {story.title}
              </h4>
              <div className="text-[11px] font-sans text-stone-400 mt-1">
                {story.author.name} · {story.readTime}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};
