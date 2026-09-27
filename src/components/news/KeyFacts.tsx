/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Info } from 'lucide-react';
import type { Fact } from '../../types/story';

interface KeyFactsProps {
  facts?: Fact[];
  className?: string;
}

export const KeyFacts: React.FC<KeyFactsProps> = ({ facts = [], className = '' }) => {
  if (!facts || facts.length === 0) return null;

  return (
    <section
      aria-label="Key Facts"
      className={`bg-white border border-hairline p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${className}`}
    >
      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-hairline">
        <Info className="w-4 h-4 text-stone-700" />
        <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">
          Key Facts
        </h3>
      </div>

      <dl className="divide-y divide-hairline-subtle font-sans text-xs sm:text-sm">
        {facts.map((fact, index) => (
          <div key={index} className="py-2.5 flex flex-col sm:flex-row sm:justify-between gap-1">
            <dt className="font-semibold text-stone-500 uppercase tracking-wider text-[11px] sm:w-1/3">
              {fact.label}
            </dt>
            <dd className="font-medium text-stone-900 sm:w-2/3 sm:text-right">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
