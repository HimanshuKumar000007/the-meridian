/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Newspaper, ArrowLeft } from 'lucide-react';

interface CategoryEmptyProps {
  categoryName: string;
  onNavigateHome: () => void;
  className?: string;
}

export const CategoryEmpty: React.FC<CategoryEmptyProps> = ({
  categoryName,
  onNavigateHome,
  className = '',
}) => {
  return (
    <div
      role="status"
      className={`py-16 sm:py-24 text-center bg-white border border-hairline p-8 max-w-2xl mx-auto my-12 shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${className}`}
    >
      <Newspaper className="w-10 h-10 mx-auto mb-4 text-stone-300" />
      <h3 className="font-serif text-2xl font-bold text-stone-800 mb-2">
        No stories published in {categoryName} yet
      </h3>
      <p className="font-sans text-xs sm:text-sm text-stone-500 max-w-md mx-auto mb-8 leading-relaxed">
        Our international correspondents are preparing new verified reports and deep investigations for this section.
      </p>
      <button
        type="button"
        onClick={onNavigateHome}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white font-sans text-xs uppercase font-semibold tracking-wider hover:bg-stone-800 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Front Page</span>
      </button>
    </div>
  );
};
