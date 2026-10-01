/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { StoryCard } from './StoryCard';
import type { Story } from '../../data/mockNews';

export type CategoryLayoutType =
  | 'ai-tech'
  | 'gaming-grid'
  | 'science-feature'
  | 'business-columns'
  | 'world-restrained';

interface CategorySectionProps {
  title: string;
  subtitle?: string;
  categorySlug: string;
  stories: Story[];
  layoutType?: CategoryLayoutType;
  onSelectStory?: (story: Story) => void;
  onViewCategory?: (categorySlug: string) => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  subtitle,
  categorySlug,
  stories,
  layoutType = 'ai-tech',
  onSelectStory,
  onViewCategory,
}) => {
  if (!stories || stories.length === 0) return null;

  const primaryStory = stories[0];
  const secondaryStories = stories.slice(1);

  return (
    <section
      aria-label={`${title} Section`}
      className="w-full py-8 sm:py-10 border-b border-hairline"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Category Header */}
        <div className="flex items-baseline justify-between pb-3 mb-6 border-b-2 border-stone-900">
          <div className="flex items-baseline gap-3">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
              {title}
            </h2>
            {subtitle && (
              <span className="hidden sm:inline text-xs font-sans text-stone-500">
                {subtitle}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onViewCategory?.(categorySlug)}
            className="group flex items-center gap-1.5 text-xs font-sans font-semibold tracking-wide uppercase text-red-900 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <span>View {title}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* 1. AI & TECHNOLOGY LAYOUT: Left Large Feature + Right Two Stacked Stories */}
        {layoutType === 'ai-tech' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 border-b lg:border-b-0 lg:border-r border-hairline lg:pr-8 pb-6 lg:pb-0">
              <StoryCard
                story={primaryStory}
                variant="standard"
                imageAspectRatio="16:9"
                showSummary={true}
                onSelectStory={onSelectStory}
              />
            </div>
            <div className="lg:col-span-5 flex flex-col space-y-6">
              {secondaryStories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  variant="horizontal"
                  imageAspectRatio="4:3"
                  showSummary={true}
                  onSelectStory={onSelectStory}
                />
              ))}
            </div>
          </div>
        )}

        {/* 2. GAMING LAYOUT: 3 Equal Visual Cards */}
        {layoutType === 'gaming-grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
            {stories.slice(0, 3).map((story, idx) => (
              <div
                key={story.id}
                className={
                  idx < 2 ? 'md:border-r md:border-hairline-subtle md:pr-6 lg:pr-8' : ''
                }
              >
                <StoryCard
                  story={story}
                  variant="standard"
                  imageAspectRatio="16:9"
                  showSummary={true}
                  onSelectStory={onSelectStory}
                />
              </div>
            ))}
          </div>
        )}

        {/* 3. SCIENCE & SPACE LAYOUT: One Dominant Feature + Two Stacked Horizontal */}
        {layoutType === 'science-feature' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 border-b lg:border-b-0 lg:border-r border-hairline lg:pr-8 pb-6 lg:pb-0">
              <StoryCard
                story={primaryStory}
                variant="standard"
                imageAspectRatio="16:9"
                showSummary={true}
                onSelectStory={onSelectStory}
              />
            </div>
            <div className="lg:col-span-5 flex flex-col space-y-6">
              {secondaryStories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  variant="horizontal"
                  imageAspectRatio="4:3"
                  showSummary={true}
                  onSelectStory={onSelectStory}
                />
              ))}
            </div>
          </div>
        )}

        {/* 4. BUSINESS LAYOUT: Typography-Led Layout (No stock trading chart clutter) */}
        {layoutType === 'business-columns' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
            {stories.slice(0, 3).map((story, idx) => (
              <div
                key={story.id}
                className={`flex flex-col justify-between ${
                  idx < 2 ? 'md:border-r md:border-hairline-subtle md:pr-6 lg:pr-8' : ''
                }`}
              >
                <StoryCard
                  story={story}
                  variant="standard"
                  showImage={idx === 0}
                  imageAspectRatio="16:9"
                  showSummary={true}
                  onSelectStory={onSelectStory}
                />
              </div>
            ))}
          </div>
        )}

        {/* 5. WORLD NEWS LAYOUT: Restrained, Dignified Layout */}
        {layoutType === 'world-restrained' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 border-b lg:border-b-0 lg:border-r border-hairline lg:pr-8 pb-6 lg:pb-0">
              <StoryCard
                story={primaryStory}
                variant="horizontal"
                imageAspectRatio="16:9"
                showSummary={true}
                onSelectStory={onSelectStory}
              />
            </div>
            <div className="lg:col-span-4 flex flex-col divide-y divide-hairline-subtle">
              {secondaryStories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  variant="minimal-text"
                  onSelectStory={onSelectStory}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
