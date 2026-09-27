/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, Compass } from 'lucide-react';
import { CATEGORY_DEFINITIONS } from '../../data/categoryDatabase';

interface CategoryErrorProps {
  categorySlug?: string;
  onNavigateHome: () => void;
  onSelectCategory: (slug: string) => void;
  className?: string;
}

export const CategoryError: React.FC<CategoryErrorProps> = ({
  categorySlug,
  onNavigateHome,
  onSelectCategory,
  className = '',
}) => {
  return (
    <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center ${className}`}>
      <div className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-widest text-red-900 mb-4 bg-red-50 border border-red-200 px-3 py-1">
        <Compass className="w-3.5 h-3.5" />
        <span>Editorial Section Not Found</span>
      </div>

      <h1 className="font-serif text-3xl sm:text-5xl font-bold text-stone-900 tracking-tight mb-4 [text-wrap:balance]">
        The requested editorial desk does not exist.
      </h1>

      <p className="font-sans text-sm sm:text-base text-stone-600 max-w-xl mx-auto leading-relaxed mb-8">
        We could not locate an editorial section matching{' '}
        {categorySlug ? (
          <code className="bg-stone-200/80 px-1.5 py-0.5 text-xs font-mono">
            /{categorySlug}
          </code>
        ) : (
          'your request'
        )}
        . Explore our active reporting desks below or return to the front page.
      </p>

      <div className="flex justify-center mb-12">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-sans text-xs uppercase font-semibold tracking-wider transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Front Page</span>
        </button>
      </div>

      <div className="border-t border-hairline pt-10 text-left max-w-2xl mx-auto">
        <h2 className="font-serif text-lg font-bold text-stone-900 mb-4">
          Active Editorial Desks
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CATEGORY_DEFINITIONS.slice(0, 6).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.slug)}
              className="p-3 text-left bg-white border border-stone-200 hover:border-stone-900 transition-colors group cursor-pointer"
            >
              <div className="font-serif font-bold text-stone-900 group-hover:text-red-950 text-sm">
                {cat.name}
              </div>
              <div className="text-[11px] font-sans text-stone-500 line-clamp-1 mt-0.5">
                {cat.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
