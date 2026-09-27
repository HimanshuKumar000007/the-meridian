/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookmarkCheck } from 'lucide-react';

interface QuickSummaryProps {
  items?: string[];
  className?: string;
}

export const QuickSummary: React.FC<QuickSummaryProps> = ({ items = [], className = '' }) => {
  if (!items || items.length === 0) return null;

  return (
    <section
      aria-label="Quick Summary"
      className={`my-8 p-6 sm:p-7 bg-[#F5F4F0] border-l-4 border-stone-900 border-t border-r border-b border-hairline ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <BookmarkCheck className="w-4 h-4 text-stone-900" />
        <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-stone-900 uppercase">
          Quick Summary
        </h2>
        <span className="text-[10px] font-sans uppercase tracking-widest text-stone-400 font-semibold ml-auto hidden sm:inline">
          Editorial Overview
        </span>
      </div>

      <ul className="space-y-3 font-sans text-stone-800 text-sm sm:text-base leading-relaxed">
        {items.map((point, index) => (
          <li key={index} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full bg-stone-900 mt-2 shrink-0"
            />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};
