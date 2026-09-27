/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const HomepageLoading: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Hero section skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pb-10 border-b border-hairline mb-10">
        <div className="lg:col-span-8 space-y-4">
          <div className="aspect-[16/9] w-full bg-stone-200" />
          <div className="h-4 w-28 bg-stone-200" />
          <div className="h-10 sm:h-12 w-4/5 bg-stone-200" />
          <div className="h-5 w-full bg-stone-200" />
        </div>
        <div className="lg:col-span-4 space-y-4">
          <div className="h-6 w-32 bg-stone-200 mb-4" />
          <div className="h-20 bg-stone-200" />
          <div className="h-20 bg-stone-200" />
          <div className="h-20 bg-stone-200" />
          <div className="h-20 bg-stone-200" />
        </div>
      </div>

      {/* Top Stories 4-card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-10 border-b border-hairline mb-10">
        <div className="space-y-3">
          <div className="aspect-[4/3] bg-stone-200" />
          <div className="h-6 bg-stone-200 w-5/6" />
          <div className="h-4 bg-stone-200 w-full" />
        </div>
        <div className="space-y-3">
          <div className="aspect-[4/3] bg-stone-200" />
          <div className="h-6 bg-stone-200 w-5/6" />
          <div className="h-4 bg-stone-200 w-full" />
        </div>
        <div className="space-y-3">
          <div className="aspect-[4/3] bg-stone-200" />
          <div className="h-6 bg-stone-200 w-5/6" />
          <div className="h-4 bg-stone-200 w-full" />
        </div>
        <div className="space-y-3">
          <div className="aspect-[4/3] bg-stone-200" />
          <div className="h-6 bg-stone-200 w-5/6" />
          <div className="h-4 bg-stone-200 w-full" />
        </div>
      </div>
    </div>
  );
};
