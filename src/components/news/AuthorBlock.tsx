/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { StoryAuthor } from '../../types/story';

interface AuthorBlockProps {
  author?: StoryAuthor;
  updatedAt?: string;
  publishedAt?: string;
  className?: string;
}

export const AuthorBlock: React.FC<AuthorBlockProps> = ({
  author,
  updatedAt,
  publishedAt,
  className = '',
}) => {
  if (!author) return null;

  const formattedDate = (dStr?: string) => {
    if (!dStr) return '';
    try {
      return new Date(dStr).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dStr;
    }
  };

  const displayDate = formattedDate(updatedAt || publishedAt);

  return (
    <section
      aria-label="About the Author"
      className={`my-8 p-6 bg-[#F5F4F0] border border-hairline flex flex-col sm:flex-row items-start sm:items-center gap-4 ${className}`}
    >
      {author.avatar ? (
        <img
          src={author.avatar}
          alt={author.name}
          className="w-14 h-14 rounded-full object-cover border border-stone-300 shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-stone-300 flex items-center justify-center font-serif text-xl font-bold text-stone-700 shrink-0">
          {author.name.charAt(0)}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <h3 className="font-serif text-lg font-bold text-stone-900">
            <a
              href={`/author/${author.slug || author.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
              className="hover:underline hover:text-stone-700 transition-colors"
            >
              {author.name}
            </a>
          </h3>
          {displayDate && (
            <span className="text-[11px] font-sans text-stone-500">
              Updated {displayDate}
            </span>
          )}
        </div>

        <p className="text-xs font-sans font-semibold uppercase tracking-wider text-red-900 mt-0.5">
          {author.role}
        </p>

        {author.bio && (
          <p className="font-sans text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
            {author.bio}
          </p>
        )}
      </div>
    </section>
  );
};
