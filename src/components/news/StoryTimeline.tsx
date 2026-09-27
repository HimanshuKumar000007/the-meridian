/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { History, ExternalLink } from 'lucide-react';
import type { StoryUpdate } from '../../types/story';

interface StoryTimelineProps {
  updates?: StoryUpdate[];
  className?: string;
}

export const StoryTimeline: React.FC<StoryTimelineProps> = ({ updates = [], className = '' }) => {
  if (!updates || updates.length === 0) return null;

  return (
    <section
      aria-label="Latest Updates Timeline"
      className={`bg-white border border-hairline p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${className}`}
    >
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-hairline">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-red-900" />
          <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">
            Latest Updates
          </h3>
        </div>
        <span className="text-[10px] font-sans uppercase font-bold tracking-wider text-red-900 bg-red-50 border border-red-200 px-2 py-0.5">
          Living Story
        </span>
      </div>

      <div className="relative pl-4 space-y-6 before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-stone-200">
        {updates.map((update, index) => (
          <article key={index} className="relative group">
            {/* Timeline bullet */}
            <div className="absolute -left-[13px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-stone-800 group-first:border-red-900 group-first:bg-red-900" />

            <div className="text-xs font-sans font-bold uppercase tracking-wider text-stone-500 mb-1">
              {update.time}
            </div>

            {update.title && (
              <h4 className="font-serif text-sm sm:text-base font-semibold text-stone-900 mb-1 leading-snug">
                {update.title}
              </h4>
            )}

            <p className="font-sans text-xs sm:text-sm text-stone-700 leading-relaxed">
              {update.text}
            </p>

            {update.source && (
              <div className="mt-1.5 text-[11px] font-sans text-stone-400 flex items-center gap-1">
                <span>Source:</span>
                {update.sourceUrl ? (
                  <a
                    href={update.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-600 hover:text-red-900 underline inline-flex items-center gap-0.5"
                  >
                    <span>{update.source}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span className="text-stone-600">{update.source}</span>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};
