/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const StoryLoading: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Category & Breadcrumb placeholder */}
      <div className="h-4 w-48 bg-stone-200 mb-6" />

      {/* Headline placeholder */}
      <div className="space-y-3 mb-6 max-w-4xl">
        <div className="h-10 sm:h-14 bg-stone-200 w-full" />
        <div className="h-10 sm:h-14 bg-stone-200 w-3/4" />
      </div>

      {/* Deck placeholder */}
      <div className="h-6 bg-stone-200 w-2/3 mb-6" />

      {/* Meta bar placeholder */}
      <div className="h-12 border-t border-b border-hairline py-3 flex justify-between items-center mb-8">
        <div className="h-4 w-40 bg-stone-200" />
        <div className="h-4 w-32 bg-stone-200" />
      </div>

      {/* Hero Image placeholder */}
      <div className="aspect-[16/9] w-full bg-stone-200 mb-8" />

      {/* Quick summary placeholder */}
      <div className="h-32 bg-stone-200/80 mb-10" />

      {/* Body content placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-4">
          <div className="h-4 bg-stone-200 w-full" />
          <div className="h-4 bg-stone-200 w-11/12" />
          <div className="h-4 bg-stone-200 w-full" />
          <div className="h-4 bg-stone-200 w-4/5" />
          <div className="h-8 bg-stone-200 w-1/2 my-6" />
          <div className="h-4 bg-stone-200 w-full" />
          <div className="h-4 bg-stone-200 w-10/12" />
        </div>
        <div className="hidden lg:block lg:col-span-4 space-y-6">
          <div className="h-48 bg-stone-200" />
          <div className="h-64 bg-stone-200" />
        </div>
      </div>
    </div>
  );
};
