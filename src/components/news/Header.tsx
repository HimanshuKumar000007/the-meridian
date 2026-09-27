/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Menu, ChevronDown, Bell } from 'lucide-react';
import { CATEGORIES } from '../../data/mockNews';

interface HeaderProps {
  activeCategory: string;
  onSelectCategory: (categoryId: string) => void;
  onOpenSearch: () => void;
  onOpenMobileMenu: () => void;
  edition: string;
  onChangeEdition: (edition: string) => void;
  onJumpNewsletter: () => void;
}

const MORE_SECTIONS = [
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'opinion', name: 'Opinion & Essays' },
  { id: 'climate', name: 'Climate & Energy' },
  { id: 'culture', name: 'Culture & Books' },
  { id: 'investigations', name: 'Deep Investigations' },
];

export const Header: React.FC<HeaderProps> = ({
  activeCategory,
  onSelectCategory,
  onOpenSearch,
  onOpenMobileMenu,
  edition,
  onChangeEdition,
  onJumpNewsletter,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Current formatted date
  const todayFormatted = 'Saturday, September 26, 2026';

  return (
    <header className="w-full bg-[#FAF9F6] border-b border-hairline sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* 1. TOP UTILITY BAR */}
      <div className="border-b border-hairline-subtle bg-[#F5F4F0]/80 backdrop-blur-xs text-[11px] font-sans text-stone-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between">
          {/* Left: Date & Weather/Edition */}
          <div className="flex items-center gap-3">
            <time className="font-medium text-stone-700">{todayFormatted}</time>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-stone-400">Edition:</span>
              {(['Global', 'US', 'UK'] as const).map((ed) => (
                <button
                  key={ed}
                  type="button"
                  onClick={() => onChangeEdition(ed)}
                  className={`px-1.5 py-0.5 transition-colors cursor-pointer ${
                    edition === ed
                      ? 'font-bold text-stone-900 border-b border-stone-800'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {ed}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Live Wire / Morning Dispatch link */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1.5 text-stone-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
              <span>Global Wire Active</span>
            </div>
            <span aria-hidden="true" className="hidden md:inline text-stone-300">·</span>
            <button
              type="button"
              onClick={onJumpNewsletter}
              className="text-stone-700 hover:text-red-900 font-medium transition-colors flex items-center gap-1"
            >
              <Bell className="w-3 h-3 text-stone-400" />
              <span>The Morning Dispatch</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN BRAND HEADER ZONE */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="p-2 -ml-2 text-stone-700 hover:text-stone-900 focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
              aria-label="Open main navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Brand Wordmark (Editorial Anchor) */}
          <div className="flex flex-col items-center mx-auto lg:mx-0">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onSelectCategory('all');
              }}
              className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
              aria-label="The Meridian Homepage"
            >
              <span className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-stone-900 group-hover:text-red-950 transition-colors uppercase">
                The Meridian
              </span>
            </a>
            <span className="hidden sm:block text-[10px] tracking-[0.2em] uppercase font-sans text-stone-500 mt-1">
              Independent Global Journalism
            </span>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenSearch}
              className="flex items-center gap-2 px-3 py-1.5 border border-stone-200 hover:border-stone-400 bg-white/80 text-stone-700 hover:text-stone-900 text-xs font-sans font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
              aria-label="Search stories and topics"
            >
              <Search className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline text-[9px] font-mono px-1 py-0.5 bg-stone-100 border border-stone-200 text-stone-400">
                /
              </kbd>
            </button>

            <button
              type="button"
              onClick={onJumpNewsletter}
              className="hidden md:inline-flex px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-sans font-medium tracking-wide uppercase transition-colors"
            >
              Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* 3. PRIMARY CATEGORY NAVIGATION (Data-driven, Zero-Pill) */}
      <nav
        aria-label="Main Editorial Sections"
        className="border-t border-hairline bg-white/90 hidden lg:block"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 py-2.5">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onSelectCategory(cat.id)}
                    className={`relative text-xs sm:text-sm font-sans tracking-wide transition-colors py-1 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 ${
                      isActive
                        ? 'font-bold text-red-950'
                        : 'font-medium text-stone-700 hover:text-stone-950'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-900" />
                    )}
                  </button>
                );
              })}

              {/* More Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  onBlur={() => setTimeout(() => setShowMoreMenu(false), 200)}
                  className="flex items-center gap-1 text-xs sm:text-sm font-sans font-medium text-stone-600 hover:text-stone-900 py-1 transition-colors focus:outline-none"
                  aria-expanded={showMoreMenu}
                >
                  <span>More</span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                </button>

                {showMoreMenu && (
                  <div className="absolute left-0 mt-2 w-48 bg-white border border-stone-200 shadow-lg py-2 z-40 animate-in fade-in zoom-in-95 duration-100">
                    {MORE_SECTIONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectCategory(item.id);
                          setShowMoreMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-sans text-stone-700 hover:bg-stone-50 hover:text-red-950 transition-colors"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="text-[11px] font-sans text-stone-400 hidden xl:block">
              Volume XXI · Issue 268
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
