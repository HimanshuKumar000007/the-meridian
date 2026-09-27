/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import type { StorySource } from '../../types/story';

interface SourcesListProps {
  sources?: StorySource[];
  className?: string;
}

export const SourcesList: React.FC<SourcesListProps> = ({ sources = [], className = '' }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <section
      aria-label="Story Sources and Attribution"
      className={`my-8 p-6 bg-white border border-hairline ${className}`}
    >
      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-hairline">
        <ShieldCheck className="w-4 h-4 text-stone-700" />
        <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">
          Sources & Reporting Attribution
        </h3>
      </div>

      <p className="text-xs font-sans text-stone-500 mb-4 leading-relaxed">
        The Meridian prioritizes source transparency. The findings, data points, and quotes in this dispatch are synthesized from the following primary publications, institutional disclosures, and correspondent dispatches:
      </p>

      <ul className="divide-y divide-hairline-subtle font-sans text-xs sm:text-sm">
        {sources.map((source, index) => (
          <li key={index} className="py-2.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-stone-400 font-mono text-[11px]">{index + 1}.</span>
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-stone-900 hover:text-red-900 underline underline-offset-2 inline-flex items-center gap-1 transition-colors"
                >
                  <span>{source.name}</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>
              ) : (
                <span className="font-medium text-stone-900">{source.name}</span>
              )}
              {source.note && (
                <span className="text-stone-500 text-xs italic ml-1">
                  ({source.note})
                </span>
              )}
            </div>

            {source.time && (
              <span className="text-stone-400 text-[11px] shrink-0 sm:text-right">
                {source.time}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
