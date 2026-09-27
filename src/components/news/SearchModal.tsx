/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, CornerDownLeft } from 'lucide-react';
import { searchStories, type Story } from '../../data/mockNews';
import { newsRepository } from '../../data/newsRepository';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStory?: (story: Story) => void;
  onNavigateToSearch?: (query: string) => void;
}

const POPULAR_TOPICS = [
  'Quantum Computing',
  'Semiconductors',
  'Space Exploration',
  'European Union',
  'Game Engines',
  'Energy Grid',
  'Robotics',
];

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectStory,
  onNavigateToSearch,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Story[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setResults([]);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let isCurrent = true;
    newsRepository
      .searchStories(query)
      .then((found) => {
        if (isCurrent) setResults(found as any);
      })
      .catch(() => {
        if (isCurrent) setResults(searchStories(query));
      });
    return () => {
      isCurrent = false;
    };
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) {
        onClose();
        if (onNavigateToSearch) {
          onNavigateToSearch(query.trim());
        } else {
          window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
        }
      }
    }
  };

  const handleFullSearch = () => {
    if (query.trim()) {
      onClose();
      if (onNavigateToSearch) {
        onNavigateToSearch(query.trim());
      } else {
        window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-stone-900/60 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search The Meridian"
    >
      <div
        className="w-full max-w-3xl bg-[#FAF9F6] border border-stone-300 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input Bar */}
        <div className="flex items-center px-4 sm:px-6 py-4 border-b border-hairline bg-white">
          <Search className="w-5 h-5 text-stone-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search news, topics, companies, reporters... (Press Enter for full search)"
            className="w-full bg-transparent text-lg sm:text-xl font-serif text-stone-900 placeholder:text-stone-400 placeholder:font-sans focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-stone-400 hover:text-stone-700 mr-2"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-stone-900 border border-stone-200 hover:border-stone-400 text-xs font-sans tracking-wide uppercase transition-colors"
            aria-label="Close search"
          >
            ESC
          </button>
        </div>

        {/* Quick Topics or Search Results */}
        <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-6 divide-y divide-hairline-subtle">
          {query.trim() === '' ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3 font-sans">
                Curated Topics
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                {POPULAR_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => {
                      setQuery(topic);
                      handleFullSearch();
                    }}
                    className="px-3 py-1.5 text-xs font-sans font-medium text-stone-700 bg-white border border-stone-200 hover:border-stone-900 hover:text-stone-900 transition-colors"
                  >
                    {topic}
                  </button>
                ))}
              </div>

              <div className="text-xs text-stone-400 font-sans flex items-center gap-1.5 pt-4 border-t border-hairline-subtle">
                <CornerDownLeft className="w-3.5 h-3.5" />
                <span>Type keywords and press Enter to search full archive</span>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-stone-500 font-sans mb-2">
                <span>Found {results.length} Quick {results.length === 1 ? 'Match' : 'Matches'}</span>
                <button
                  type="button"
                  onClick={handleFullSearch}
                  className="text-stone-900 hover:text-red-900 flex items-center gap-1 transition-colors"
                >
                  <span>Open Full Search Page</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {results.slice(0, 5).map((story) => (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => {
                    onSelectStory?.(story);
                    onClose();
                  }}
                  className="w-full text-left group p-3 hover:bg-white border border-transparent hover:border-stone-200 transition-all block focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                >
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-red-900 mb-1 font-sans">
                    <span>{story.category}</span>
                    <span aria-hidden="true" className="text-stone-300">·</span>
                    <span className="text-stone-500 font-normal">{story.timeDisplay}</span>
                  </div>
                  <h4 className="text-base sm:text-lg font-serif font-semibold text-stone-900 group-hover:text-red-950 leading-snug mb-1">
                    {story.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-stone-600 font-sans line-clamp-2 leading-relaxed">
                    {story.summary}
                  </p>
                </button>
              ))}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleFullSearch}
                  className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-sans font-semibold tracking-wider uppercase flex items-center justify-center gap-2 transition-colors"
                >
                  <span>See all results for &ldquo;{query}&rdquo;</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="font-serif text-lg text-stone-800 mb-1">
                No matching reports found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-stone-500 font-sans max-w-sm mx-auto mb-4">
                Try searching for broader keywords such as &ldquo;technology&rdquo;, &ldquo;quantum&rdquo;, or &ldquo;space&rdquo;.
              </p>
              <button
                type="button"
                onClick={handleFullSearch}
                className="px-4 py-2 border border-stone-300 text-xs font-semibold uppercase tracking-wider text-stone-700 hover:border-stone-900 transition-colors"
              >
                Search Full Archive
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-stone-100 border-t border-hairline flex items-center justify-between text-xs text-stone-500 font-sans">
          <span>The Meridian Index</span>
          <div className="flex items-center gap-1">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-stone-300 text-[10px] font-mono">ENTER</kbd>
            <span>for full search</span>
          </div>
        </div>
      </div>
    </div>
  );
};
