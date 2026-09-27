/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { X, Clock, Share2, Check, Bookmark, ArrowLeft } from 'lucide-react';
import type { Story } from '../../data/mockNews';

interface StoryDetailModalProps {
  story: Story | null;
  onClose: () => void;
  onSelectRelatedStory?: (story: Story) => void;
  allStories?: Story[];
}

export const StoryDetailModal: React.FC<StoryDetailModalProps> = ({
  story,
  onClose,
  onSelectRelatedStory,
  allStories = [],
}) => {
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (story) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && story) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [story, onClose]);

  if (!story) return null;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const related = allStories
    .filter((s) => s.id !== story.id && s.category === story.category)
    .slice(0, 3);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-stone-900/70 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={story.title}
    >
      <div
        className="relative w-full max-w-4xl min-h-screen sm:min-h-0 sm:max-h-[92vh] bg-[#FAF9F6] border-0 sm:border border-stone-300 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Sticky Utility Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 py-3 bg-[#FAF9F6]/95 backdrop-blur-xs border-b border-hairline">
          <div className="flex items-center gap-2 text-xs font-sans text-stone-500">
            <span className="font-semibold uppercase tracking-wider text-red-900">
              {story.category}
            </span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-stone-400" />
              <span>{story.readTime}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBookmarked(!bookmarked)}
              className={`p-1.5 border transition-colors ${
                bookmarked
                  ? 'bg-stone-900 border-stone-900 text-white'
                  : 'bg-white border-stone-200 text-stone-600 hover:text-stone-900'
              }`}
              title={bookmarked ? 'Saved' : 'Bookmark story'}
              aria-label="Bookmark story"
            >
              <Bookmark className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-stone-200 text-xs font-sans text-stone-600 hover:text-stone-900 hover:border-stone-400 transition-colors"
              title="Copy story link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-400 transition-colors ml-1"
              aria-label="Close article"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Article Body Scroll Area */}
        <div className="overflow-y-auto px-4 sm:px-12 py-6 sm:py-10">
          <div className="max-w-2xl mx-auto">
            {/* Category kicker */}
            <div className="text-xs font-bold uppercase tracking-widest text-red-900 mb-3 font-sans">
              {story.category} {story.subcategory && `· ${story.subcategory}`}
            </div>

            {/* Headline */}
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold text-stone-900 leading-[1.18] mb-4 [text-wrap:balance]">
              {story.title}
            </h1>

            {/* Lead deck / Summary */}
            <p className="font-sans text-lg sm:text-xl text-stone-700 leading-relaxed mb-6 font-normal">
              {story.summary}
            </p>

            {/* Byline & Timestamps */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-t border-b border-hairline mb-8 text-xs font-sans text-stone-600">
              <div className="flex items-center gap-2.5">
                <div>
                  <div className="font-semibold text-stone-900 text-sm">
                    {story.author.name}
                  </div>
                  <div className="text-stone-500">{story.author.role}</div>
                </div>
              </div>
              <div className="text-right text-stone-500">
                <div>Published {story.timeDisplay}</div>
                {story.updatedAt && (
                  <div className="text-[11px] text-stone-400">Verified by Editorial Desk</div>
                )}
              </div>
            </div>

            {/* Featured Image */}
            {story.image && (
              <figure className="mb-8">
                <div className="overflow-hidden bg-stone-100 aspect-video w-full">
                  <img
                    src={story.image}
                    alt={story.alt || story.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {story.caption && (
                  <figcaption className="text-xs font-serif italic text-stone-600 mt-2.5 leading-normal">
                    {story.caption}{' '}
                    {story.credit && (
                      <span className="not-italic text-stone-400 font-sans text-[11px]">
                        Photograph: {story.credit}
                      </span>
                    )}
                  </figcaption>
                )}
              </figure>
            )}

            {/* Editorial Body Prose with authentic styling & drop cap */}
            <div className="prose prose-stone max-w-none text-stone-800 font-serif text-[17px] sm:text-[18px] leading-[1.8] space-y-6">
              <p className="first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-stone-900">
                The rapid convergence of experimental physical infrastructure and scalable computational architectures has introduced a new paradigm in contemporary research. In specialized facilities across North America, Europe, and East Asia, engineers and research teams are confronting long-standing thermodynamic barriers with unprecedented empirical measurement tools.
              </p>

              <p>
                According to internal briefing documents reviewed by The Meridian, the latest performance metrics demonstrate reproducibility across dozens of continuous evaluation runs. Unlike earlier single-instance demonstrations that required bespoke calibration under narrow laboratory conditions, the current architecture operates reliably within standard data center tolerance margins.
              </p>

              {/* Editorial Pull Quote */}
              <blockquote className="my-8 py-4 pl-6 border-l-2 border-stone-900 not-italic font-serif text-xl sm:text-2xl text-stone-900 leading-snug">
                &ldquo;We have moved past the exploratory stage into predictable engineering execution. The fundamental questions of viability have been conclusively answered.&rdquo;
              </blockquote>

              <p>
                Industry analysts emphasize that while capital expenditures remain elevated, the strategic implications for telecommunications, global logistics, and materials discovery will compound over the coming decade. Regulatory authorities in both Washington and Brussels have signaled that formal governance frameworks will be published before the close of the calendar quarter.
              </p>
            </div>

            {/* Related Reporting Section */}
            {related.length > 0 && (
              <div className="mt-12 pt-8 border-t-2 border-stone-900">
                <h3 className="font-serif text-xl font-bold text-stone-900 mb-4">
                  Related Coverage in {story.category}
                </h3>
                <div className="divide-y divide-hairline-subtle">
                  {related.map((rel) => (
                    <button
                      key={rel.id}
                      type="button"
                      onClick={() => onSelectRelatedStory?.(rel)}
                      className="w-full text-left py-3 group hover:text-red-900 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="text-[11px] font-sans font-semibold uppercase tracking-wider text-red-900 mb-0.5">
                          {rel.timeDisplay}
                        </div>
                        <h4 className="font-serif text-base font-semibold text-stone-900 group-hover:text-red-950">
                          {rel.title}
                        </h4>
                      </div>
                      <ArrowLeft className="w-4 h-4 rotate-180 text-stone-400 group-hover:text-red-900 shrink-0 ml-4" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
