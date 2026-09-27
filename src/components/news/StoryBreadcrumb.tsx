/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';

interface StoryBreadcrumbProps {
  category: string;
  subcategory?: string;
  onNavigateHome: () => void;
  onSelectCategory?: (category: string) => void;
  className?: string;
}

export const StoryBreadcrumb: React.FC<StoryBreadcrumbProps> = ({
  category,
  subcategory,
  onNavigateHome,
  onSelectCategory,
  className = '',
}) => {
  return (
    <nav aria-label="Breadcrumb" className={`text-[11px] sm:text-xs font-sans tracking-wide ${className}`}>
      <ol className="flex items-center flex-wrap gap-1.5 text-stone-500">
        <li>
          <button
            type="button"
            onClick={onNavigateHome}
            className="hover:text-stone-900 transition-colors uppercase font-medium cursor-pointer"
          >
            Home
          </button>
        </li>

        <li aria-hidden="true" className="text-stone-300">
          <ChevronRight className="w-3 h-3" />
        </li>

        <li>
          {onSelectCategory ? (
            <button
              type="button"
              onClick={() => onSelectCategory(category)}
              className="hover:text-stone-900 transition-colors uppercase font-medium cursor-pointer"
            >
              {category}
            </button>
          ) : (
            <span className="uppercase font-medium text-stone-700">{category}</span>
          )}
        </li>

        {subcategory && (
          <>
            <li aria-hidden="true" className="text-stone-300">
              <ChevronRight className="w-3 h-3" />
            </li>
            <li aria-current="page">
              <span className="uppercase font-semibold text-stone-900 truncate max-w-[200px] inline-block align-bottom">
                {subcategory}
              </span>
            </li>
          </>
        )}
      </ol>
    </nav>
  );
};
