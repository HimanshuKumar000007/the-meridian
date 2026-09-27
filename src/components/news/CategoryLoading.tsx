/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const CategoryLoading: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-32 bg-stone-200 mb-6" />

      {/* Hero title & description skeleton */}
      <div className="border-b-2 border-stone-200 pb-6 mb-8 space-y-3">
        <div className="h-4 w-28 bg-stone-200" />
        <div className="h-12 sm:h-14 w-64 bg-stone-200" />
        <div className="h-5 w-full max-w-2xl bg-stone-200" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2 mb-10 overflow-hidden">
        <div className="h-8 w-20 bg-stone-200" />
        <div className="h-8 w-24 bg-stone-200" />
        <div className="h-8 w-28 bg-stone-200" />
        <div className="h-8 w-24 bg-stone-200" />
      </div>

      {/* Featured block skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        <div className="lg:col-span-8 space-y-4">
          <div className="aspect-[16/9] w-full bg-stone-200" />
          <div className="h-8 w-3/4 bg-stone-200" />
          <div className="h-4 w-full bg-stone-200" />
        </div>
        <div className="lg:col-span-4 space-y-6">
          <div className="h-28 bg-stone-200" />
          <div className="h-28 bg-stone-200" />
          <div className="h-28 bg-stone-200" />
        </div>
      </div>

      {/* Story grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="h-64 bg-stone-200" />
        <div className="h-64 bg-stone-200" />
        <div className="h-64 bg-stone-200" />
      </div>
    </div>
  );
};
