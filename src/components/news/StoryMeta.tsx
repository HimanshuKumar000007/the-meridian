/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock, Calendar, CheckCircle } from 'lucide-react';
import type { StoryAuthor, StoryStatus } from '../../types/story';

interface StoryMetaProps {
  author?: StoryAuthor;
  publishedAt: string;
  updatedAt?: string;
  timeDisplay: string;
  readTime: string;
  status?: StoryStatus;
  className?: string;
}

export const StoryMeta: React.FC<StoryMetaProps> = ({
  author,
  publishedAt,
  updatedAt,
  timeDisplay,
  readTime,
  status,
  className = '',
}) => {
  // Format readable published date
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const statusColorMap: Partial<Record<StoryStatus, string>> = {
    Developing: 'text-amber-800 bg-amber-50 border-amber-200/80',
    Live: 'text-red-800 bg-red-50 border-red-200/80',
    Updated: 'text-stone-700 bg-stone-100 border-stone-200',
    Analysis: 'text-blue-900 bg-blue-50/70 border-blue-200/70',
    Explainer: 'text-emerald-900 bg-emerald-50/70 border-emerald-200/70',
    Announcement: 'text-purple-900 bg-purple-50/70 border-purple-200/70',
    Review: 'text-stone-800 bg-stone-100 border-stone-200',
  };

  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 py-3.5 border-t border-b border-hairline text-xs font-sans text-stone-600 ${className}`}>
      {/* Left: Author byline */}
      <div className="flex items-center gap-3">
        {author?.avatar && (
          <img
            src={author.avatar}
            alt={author.name}
            className="w-10 h-10 rounded-full object-cover border border-stone-200 shrink-0"
          />
        )}
        <div>
          <div className="font-semibold text-stone-900 text-sm">
            {author ? `By ${author.name}` : 'By The Meridian Editorial Team'}
          </div>
          {author?.role && (
            <div className="text-stone-500 text-[11px]">{author.role}</div>
          )}
        </div>
      </div>

      {/* Right: Dates, Read Time & Optional Status */}
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-stone-500 text-right">
        {status && (
          <span
            className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider border ${
              statusColorMap[status] || 'text-stone-700 bg-stone-100 border-stone-200'
            }`}
          >
            {status === 'Live' && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse mr-1.5" />
            )}
            {status}
          </span>
        )}

        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-stone-400" />
          <span>{formatDate(publishedAt)}</span>
        </div>

        {updatedAt && (
          <div className="flex items-center gap-1 text-stone-600 font-medium">
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span>{timeDisplay}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <span aria-hidden="true" className="text-stone-300">·</span>
          <Clock className="w-3.5 h-3.5 text-stone-400" />
          <span>{readTime}</span>
        </div>

        <div className="hidden lg:flex items-center gap-1 text-[11px] text-stone-400">
          <span aria-hidden="true" className="text-stone-300">·</span>
          <CheckCircle className="w-3 h-3 text-emerald-600" />
          <span>Verified Editorial</span>
        </div>
      </div>
    </div>
  );
};
