/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';

interface CategoryBreadcrumbProps {
  categoryName: string;
  subcategoryName?: string;
  onNavigateHome: () => void;
  onSelectCategory?: () => void;
  className?: string;
}

export const CategoryBreadcrumb: React.FC<CategoryBreadcrumbProps> = ({
  categoryName,
  subcategoryName,
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
          {subcategoryName && onSelectCategory ? (
            <button
              type="button"
              onClick={onSelectCategory}
              className="hover:text-stone-900 transition-colors uppercase font-medium cursor-pointer"
            >
              {categoryName}
            </button>
          ) : (
            <span
              aria-current={!subcategoryName ? 'page' : undefined}
              className="uppercase font-semibold text-stone-900"
            >
              {categoryName}
            </span>
          )}
        </li>

        {subcategoryName && subcategoryName.toLowerCase() !== 'all' && (
          <>
            <li aria-hidden="true" className="text-stone-300">
              <ChevronRight className="w-3 h-3" />
            </li>
            <li aria-current="page">
              <span className="uppercase font-semibold text-stone-900">
                {subcategoryName}
              </span>
            </li>
          </>
        )}
      </ol>
    </nav>
  );
};
