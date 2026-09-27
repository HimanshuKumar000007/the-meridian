/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { StoryCorrection } from '../../types/story';

interface StoryCorrectionsProps {
  corrections?: StoryCorrection[];
  className?: string;
}

export const StoryCorrections: React.FC<StoryCorrectionsProps> = ({
  corrections = [],
  className = '',
}) => {
  if (!corrections || corrections.length === 0) return null;

  return (
    <aside
      aria-label="Editorial Corrections and Clarifications"
      className={`my-6 p-4 sm:p-5 bg-amber-50/60 border-l-2 border-amber-800 text-stone-800 font-sans text-xs sm:text-sm ${className}`}
    >
      <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-amber-900 text-xs mb-2">
        <AlertCircle className="w-3.5 h-3.5 text-amber-800" />
        <span>Corrections & Updates</span>
      </div>

      <div className="space-y-2">
        {corrections.map((corr, idx) => (
          <div key={idx} className="leading-relaxed">
            <span className="font-semibold text-stone-900">{corr.date}: </span>
            <span className="text-stone-700">{corr.text}</span>
          </div>
        ))}
      </div>
    </aside>
  );
};
