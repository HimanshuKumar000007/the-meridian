/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { CategorySubcategory } from '../../types/category';

interface CategoryTabsProps {
  subcategories: CategorySubcategory[];
  activeSubcategory: string;
  onSelectSubcategory: (subcatSlug: string) => void;
  className?: string;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  subcategories,
  activeSubcategory,
  onSelectSubcategory,
  className = '',
}) => {
  if (!subcategories || subcategories.length <= 1) return null;

  return (
    <div
      className={`border-b border-hairline bg-[#FAF9F6] sticky top-14 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 mb-8 ${className}`}
    >
      <div
        role="tablist"
        aria-label="Subcategory filter tabs"
        className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-1"
      >
        {subcategories.map((sub) => {
          const isActive =
            activeSubcategory === sub.slug ||
            (activeSubcategory === 'all' && sub.slug === 'all') ||
            (!activeSubcategory && sub.slug === 'all');

          return (
            <button
              key={sub.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => onSelectSubcategory(sub.slug)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-sans tracking-wide uppercase whitespace-nowrap transition-colors cursor-pointer border ${
                isActive
                  ? 'bg-stone-900 text-white border-stone-900 font-semibold shadow-xs'
                  : 'bg-white text-stone-600 hover:text-stone-950 border-stone-200/80 hover:border-stone-400 font-medium'
              }`}
            >
              {sub.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};
