/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Newspaper } from 'lucide-react';
import type { Story } from '../../data/mockNews';

interface StoryCardProps {
  story: Story;
  variant?: 'featured' | 'standard' | 'compact' | 'horizontal' | 'minimal-text';
  showSummary?: boolean;
  showImage?: boolean;
  imageAspectRatio?: '16:9' | '4:3' | '1:1';
  onSelectStory?: (story: Story) => void;
  className?: string;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  variant = 'standard',
  showSummary = true,
  showImage = true,
  imageAspectRatio = '16:9',
  onSelectStory,
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onSelectStory) {
      onSelectStory(story);
    }
  };

  const aspectClass =
    imageAspectRatio === '1:1'
      ? 'aspect-square'
      : imageAspectRatio === '4:3'
      ? 'aspect-[4/3]'
      : 'aspect-[16/9]';

  // Fallback image container with editorial tone
  const renderImage = () => {
    if (!showImage || !story.image) return null;

    return (
      <div className={`relative overflow-hidden bg-stone-100 ${aspectClass} w-full max-h-[360px] sm:max-h-[420px] lg:max-h-[480px]`}>
        {!imgFailed ? (
          <img
            src={story.image}
            alt={story.alt || story.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 p-4 text-stone-400">
            <Newspaper className="w-8 h-8 mb-2 opacity-40" />
            <span className="text-xs uppercase tracking-wider font-sans font-medium text-stone-500">
              {story.category}
            </span>
          </div>
        )}
      </div>
    );
  };

  // FEATURED VARIANT (Lead story treatment)
  if (variant === 'featured') {
    return (
      <article
        onClick={handleClick}
        className={`group cursor-pointer flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-none ${className}`}
        tabIndex={0}
        role="button"
        aria-label={story.title}
      >
        <div className="mb-4">{renderImage()}</div>
        {story.caption && (
          <p className="text-xs font-serif italic text-stone-500 mb-3 -mt-2">
            {story.caption} {story.credit && <span className="not-italic text-stone-400 font-sans">({story.credit})</span>}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-red-900 mb-2 font-sans">
          <span>{story.category}</span>
          {story.subcategory && (
            <>
              <span className="text-stone-300" aria-hidden="true">/</span>
              <span className="text-stone-600 font-medium">{story.subcategory}</span>
            </>
          )}
        </div>

        <h1 className="text-[28px] sm:text-[36px] md:text-[38px] lg:text-[42px] font-serif font-semibold text-stone-900 leading-[1.12] mb-3 group-hover:text-red-950 transition-colors duration-150 [text-wrap:balance]">
          {story.title}
        </h1>

        {showSummary && story.summary && (
          <p className="text-base sm:text-lg text-stone-700 leading-relaxed font-sans mb-4 max-w-3xl">
            {story.summary}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-stone-500 font-sans pt-1 border-t border-hairline-subtle mt-auto">
          <span className="font-medium text-stone-800">{story.author.name}</span>
          <span aria-hidden="true" className="text-stone-400">·</span>
          <span>{story.timeDisplay}</span>
          <span aria-hidden="true" className="text-stone-400">·</span>
          <span>{story.readTime}</span>
        </div>
      </article>
    );
  }

  // HORIZONTAL VARIANT (Image on side, text on other)
  if (variant === 'horizontal') {
    return (
      <article
        onClick={handleClick}
        className={`group cursor-pointer grid grid-cols-1 sm:grid-cols-12 gap-4 items-start focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${className}`}
        tabIndex={0}
        role="button"
        aria-label={story.title}
      >
        <div className="sm:col-span-5 order-1 sm:order-2">{renderImage()}</div>
        <div className="sm:col-span-7 order-2 sm:order-1 flex flex-col h-full">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-red-900 mb-1.5 font-sans">
            <span>{story.category}</span>
          </div>
          <h3 className="text-lg sm:text-xl font-serif font-semibold text-stone-900 leading-snug mb-2 group-hover:text-red-950 transition-colors duration-150 [text-wrap:balance]">
            {story.title}
          </h3>
          {showSummary && story.summary && (
            <p className="text-sm text-stone-600 font-sans line-clamp-2 leading-relaxed mb-3">
              {story.summary}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-stone-500 font-sans mt-auto">
            <span>{story.author.name}</span>
            <span aria-hidden="true" className="text-stone-400">·</span>
            <span>{story.timeDisplay}</span>
          </div>
        </div>
      </article>
    );
  }

  // MINIMAL TEXT VARIANT (Live Feed / Quick Headlines)
  if (variant === 'minimal-text') {
    return (
      <article
        onClick={handleClick}
        className={`group cursor-pointer py-3 border-b border-hairline-subtle last:border-b-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 ${className}`}
        tabIndex={0}
        role="button"
        aria-label={story.title}
      >
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-mono text-xs font-medium text-stone-900 tabular-nums">
            {story.timeDisplay}
          </span>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <span className="text-xs uppercase font-semibold text-red-900 font-sans tracking-wider">
            {story.category}
          </span>
          {story.isLive && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 uppercase tracking-widest font-sans ml-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <h4 className="text-sm sm:text-[15px] font-serif font-medium text-stone-900 leading-snug group-hover:text-red-950 transition-colors duration-150">
          {story.title}
        </h4>
      </article>
    );
  }

  // COMPACT VARIANT (Sidebar, related list)
  if (variant === 'compact') {
    return (
      <article
        onClick={handleClick}
        className={`group cursor-pointer flex gap-3 items-start py-3 border-b border-hairline-subtle last:border-b-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 ${className}`}
        tabIndex={0}
        role="button"
        aria-label={story.title}
      >
        {showImage && story.image && (
          <div className="w-20 h-16 shrink-0 overflow-hidden bg-stone-100">
            <img
              src={story.image}
              alt={story.alt || story.title}
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold uppercase text-red-900 tracking-wider font-sans mb-1">
            {story.category}
          </div>
          <h4 className="text-sm font-serif font-medium text-stone-900 leading-snug group-hover:text-red-950 transition-colors line-clamp-2">
            {story.title}
          </h4>
          <div className="text-[11px] text-stone-500 font-sans mt-1">
            {story.timeDisplay}
          </div>
        </div>
      </article>
    );
  }

  // STANDARD CARD VARIANT (Default grid card)
  return (
    <article
      onClick={handleClick}
      className={`group cursor-pointer flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${className}`}
      tabIndex={0}
      role="button"
      aria-label={story.title}
    >
      {showImage && <div className="mb-3">{renderImage()}</div>}

      <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-red-900 mb-1.5 font-sans">
        <span>{story.category}</span>
        {story.subcategory && (
          <>
            <span className="text-stone-300" aria-hidden="true">·</span>
            <span className="text-stone-500 font-normal">{story.subcategory}</span>
          </>
        )}
      </div>

      <h3 className="text-lg sm:text-xl font-serif font-semibold text-stone-900 leading-snug mb-2 group-hover:text-red-950 transition-colors duration-150 [text-wrap:balance]">
        {story.title}
      </h3>

      {showSummary && story.summary && (
        <p className="text-sm text-stone-600 font-sans leading-relaxed mb-3 line-clamp-2">
          {story.summary}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-stone-500 font-sans pt-2 border-t border-hairline-subtle mt-auto">
        <span className="truncate">{story.author.name}</span>
        <span aria-hidden="true" className="text-stone-400">·</span>
        <span className="shrink-0">{story.timeDisplay}</span>
        <span aria-hidden="true" className="text-stone-400">·</span>
        <span className="shrink-0">{story.readTime}</span>
      </div>
    </article>
  );
};
