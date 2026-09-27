/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { NewsCategory } from '../../types/category';
import { Newspaper, Sparkles } from 'lucide-react';

interface CategoryHeroProps {
  category: NewsCategory;
  storyCount?: number;
  className?: string;
}

export const CategoryHero: React.FC<CategoryHeroProps> = ({
  category,
  storyCount = 0,
  className = '',
}) => {
  return (
    <section
      aria-label={`${category.name} Section Header`}
      className={`border-b-2 border-stone-900 pb-6 mb-8 ${className}`}
    >
      {/* Top Meta Tagging */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-sans text-stone-500 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-widest text-red-900">
            Editorial Section
          </span>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <div className="flex items-center gap-1 text-stone-600">
            <Newspaper className="w-3.5 h-3.5 text-stone-400" />
            <span>{storyCount} {storyCount === 1 ? 'Dispatch' : 'Dispatches'}</span>
          </div>
        </div>

        {category.featuredTopic && (
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-sans text-stone-600 bg-stone-100/80 px-2 py-0.5 border border-stone-200">
            <Sparkles className="w-3 h-3 text-red-900" />
            <span className="text-stone-400">Topic:</span>
            <span className="font-medium text-stone-900">{category.featuredTopic}</span>
          </div>
        )}
      </div>

      {/* Primary Category Title */}
      <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 mb-3 [text-wrap:balance]">
        {category.name}
      </h1>

      {/* Description */}
      <p className="font-sans text-base sm:text-lg text-stone-600 max-w-3xl leading-relaxed">
        {category.longDescription || category.description}
      </p>
    </section>
  );
};
