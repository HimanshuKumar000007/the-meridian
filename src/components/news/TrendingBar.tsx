/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { TrendingItem } from '../../data/mockNews';

interface TrendingBarProps {
  items: TrendingItem[];
  onSelectItem?: (item: TrendingItem) => void;
}

export const TrendingBar: React.FC<TrendingBarProps> = ({ items, onSelectItem }) => {
  return (
    <nav aria-label="Trending headlines" className="w-full border-b border-hairline bg-white/70 backdrop-blur-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 py-2 text-xs">
          {/* Label */}
          <div className="flex items-center gap-1.5 shrink-0 font-sans font-bold tracking-wider uppercase text-red-900 border-r border-hairline pr-3">
            <span className="w-1.5 h-1.5 rounded-full bg-red-700" aria-hidden="true" />
            <span>Trending</span>
          </div>

          {/* Horizontal scroll list */}
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar whitespace-nowrap py-0.5">
            {items.map((item, idx) => (
              <React.Fragment key={item.id}>
                {idx > 0 && (
                  <span className="text-stone-300 select-none" aria-hidden="true">
                    /
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onSelectItem?.(item)}
                  className="group flex items-baseline gap-1.5 hover:text-stone-900 text-stone-700 transition-colors text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                >
                  <span className="font-semibold text-stone-500 group-hover:text-red-900 font-sans text-[11px] tracking-wide uppercase transition-colors">
                    {item.category}:
                  </span>
                  <span className="font-serif text-sm font-medium group-hover:underline underline-offset-2 decoration-stone-400">
                    {item.title}
                  </span>
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};
