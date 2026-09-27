/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { ArticleBlock } from '../../types/story';

interface ArticleContentProps {
  blocks: ArticleBlock[];
  className?: string;
}

export const ArticleContent: React.FC<ArticleContentProps> = ({ blocks, className = '' }) => {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div
      id="article-body"
      className={`prose-editorial max-w-[760px] text-stone-900 font-serif text-[17px] sm:text-[18px] leading-[1.75] space-y-6 ${className}`}
    >
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'paragraph': {
            if (block.lead || index === 0) {
              return (
                <p
                  key={index}
                  className="first-letter:text-5xl sm:first-letter:text-6xl first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:mr-3.5 first-letter:mt-1 first-letter:text-stone-900 first-letter:leading-none text-stone-900 text-[18px] sm:text-[19px] leading-[1.8]"
                >
                  {block.text}
                </p>
              );
            }
            return (
              <p key={index} className="text-stone-800 text-[17px] sm:text-[18px] leading-[1.75]">
                {block.text}
              </p>
            );
          }

          case 'heading': {
            if (block.level === 2) {
              return (
                <h2
                  key={index}
                  id={block.id}
                  className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 pt-6 pb-1 border-b border-hairline-subtle"
                >
                  {block.text}
                </h2>
              );
            }
            return (
              <h3
                key={index}
                id={block.id}
                className="font-serif text-xl sm:text-2xl font-semibold text-stone-900 pt-4"
              >
                {block.text}
              </h3>
            );
          }

          case 'quote': {
            return (
              <figure key={index} className="my-8 py-4 sm:py-6 pl-6 sm:pl-8 border-l-2 border-stone-900 bg-transparent">
                <blockquote className="not-italic font-serif text-xl sm:text-2xl text-stone-900 leading-snug font-medium">
                  &ldquo;{block.quote}&rdquo;
                </blockquote>
                {(block.attribution || block.role) && (
                  <figcaption className="mt-3 text-xs sm:text-sm font-sans text-stone-600">
                    <span className="font-semibold text-stone-900">{block.attribution}</span>
                    {block.role && <span className="text-stone-500">, {block.role}</span>}
                  </figcaption>
                )}
              </figure>
            );
          }

          case 'list': {
            const ListTag = block.ordered ? 'ol' : 'ul';
            return (
              <ListTag
                key={index}
                className={`my-6 space-y-2.5 pl-6 font-sans text-stone-800 text-sm sm:text-base leading-relaxed ${
                  block.ordered ? 'list-decimal' : 'list-disc marker:text-stone-400'
                }`}
              >
                {block.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ListTag>
            );
          }

          case 'image': {
            return (
              <figure key={index} className="my-8">
                <div className="overflow-hidden bg-stone-100 aspect-video w-full border border-hairline">
                  <img
                    src={block.url}
                    alt={block.alt}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                {(block.caption || block.credit) && (
                  <figcaption className="mt-2 text-xs text-stone-500 font-serif italic flex justify-between gap-2">
                    <span>{block.caption}</span>
                    {block.credit && (
                      <span className="not-italic font-sans text-[11px] text-stone-400">
                        {block.credit}
                      </span>
                    )}
                  </figcaption>
                )}
              </figure>
            );
          }

          case 'callout': {
            return (
              <aside
                key={index}
                aria-label={block.title || 'Editorial Note'}
                className="my-8 p-5 sm:p-6 bg-stone-100/80 border-l-2 border-stone-700 text-stone-800 font-sans"
              >
                {block.title && (
                  <div className="font-semibold text-xs uppercase tracking-wider text-stone-900 mb-2">
                    {block.title}
                  </div>
                )}
                <div className="text-sm leading-relaxed">{block.text}</div>
              </aside>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
};
