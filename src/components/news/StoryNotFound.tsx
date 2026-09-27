/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, Search, BookOpen } from 'lucide-react';
import type { Story } from '../../data/mockNews';
import { StoryCard } from './StoryCard';

interface StoryNotFoundProps {
  slug?: string;
  onNavigateHome: () => void;
  onOpenSearch?: () => void;
  onSelectStory?: (story: Story) => void;
  suggestedStories?: Story[];
}

export const StoryNotFound: React.FC<StoryNotFoundProps> = ({
  slug,
  onNavigateHome,
  onOpenSearch,
  onSelectStory,
  suggestedStories = [],
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
      <div className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-widest text-red-900 mb-4 bg-red-50 border border-red-200 px-3 py-1">
        <BookOpen className="w-3.5 h-3.5" />
        <span>404 — Article Not Found</span>
      </div>

      <h1 className="font-serif text-3xl sm:text-5xl font-bold text-stone-900 tracking-tight mb-4 [text-wrap:balance]">
        The requested dispatch is not in our archive.
      </h1>

      <p className="font-sans text-sm sm:text-base text-stone-600 max-w-xl mx-auto leading-relaxed mb-8">
        The article URL {slug ? <code className="bg-stone-200/70 px-1.5 py-0.5 text-xs font-mono">{slug}</code> : 'you requested'} could not be located. It may have been updated, relocated, or temporarily retracted for editorial verification.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-sans text-xs uppercase font-semibold tracking-wider transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Front Page</span>
        </button>

        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-stone-300 hover:border-stone-500 text-stone-800 font-sans text-xs uppercase font-semibold tracking-wider transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Search The Archive</span>
          </button>
        )}
      </div>

      {suggestedStories.length > 0 && (
        <div className="text-left pt-12 border-t-2 border-stone-900">
          <h2 className="font-serif text-2xl font-bold text-stone-900 mb-6">
            Recommended Dispatches
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {suggestedStories.slice(0, 3).map((item) => (
              <StoryCard
                key={item.id}
                story={item}
                variant="standard"
                imageAspectRatio="16:9"
                showSummary={true}
                onSelectStory={onSelectStory}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
