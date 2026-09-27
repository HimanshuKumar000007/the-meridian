/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Search, ChevronRight } from 'lucide-react';
import { CATEGORIES, type Category } from '../../data/mockNews';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeCategory: string;
  onSelectCategory: (catId: string) => void;
  onOpenSearch: () => void;
  edition: string;
  onChangeEdition: (ed: string) => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  activeCategory,
  onSelectCategory,
  onOpenSearch,
  edition,
  onChangeEdition,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation Menu"
    >
      <div
        className="w-full max-w-xs bg-[#FAF9F6] h-full shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-left duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-hairline bg-white">
          <div className="font-serif text-lg font-bold tracking-tight text-stone-900">
            THE MERIDIAN
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-500 hover:text-stone-900 focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search button */}
        <div className="p-4 border-b border-hairline">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSearch();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-stone-200 text-stone-600 text-sm font-sans hover:border-stone-400"
          >
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4 text-stone-400" />
              <span>Search The Meridian...</span>
            </span>
            <kbd className="text-[10px] font-mono px-1 py-0.5 bg-stone-100 text-stone-400">ESC</kbd>
          </button>
        </div>

        {/* Edition selector */}
        <div className="px-4 py-3 border-b border-hairline bg-stone-50/50">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 font-sans mb-1.5">
            Regional Edition
          </div>
          <div className="flex items-center gap-2">
            {['Global', 'US', 'UK', 'Europe'].map((ed) => (
              <button
                key={ed}
                type="button"
                onClick={() => onChangeEdition(ed)}
                className={`text-xs px-2.5 py-1 font-sans transition-colors ${
                  edition === ed
                    ? 'bg-stone-900 text-white font-medium'
                    : 'text-stone-600 hover:text-stone-900 bg-white border border-stone-200'
                }`}
              >
                {ed}
              </button>
            ))}
          </div>
        </div>

        {/* Categories list */}
        <nav className="p-4 flex-1 divide-y divide-hairline-subtle" aria-label="Mobile Categories">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 font-sans mb-2">
            Editorial Sections
          </div>
          {CATEGORIES.map((cat: Category) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onSelectCategory(cat.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between py-3 text-left transition-colors font-sans text-base ${
                  isActive
                    ? 'font-bold text-red-900 pl-1 border-l-2 border-red-800'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                <span>{cat.name}</span>
                <ChevronRight className="w-4 h-4 text-stone-300" />
              </button>
            );
          })}
        </nav>

        {/* Footer links */}
        <div className="p-4 bg-stone-100 border-t border-hairline text-xs text-stone-500 font-sans space-y-2">
          <div className="font-semibold uppercase tracking-wider text-stone-700 text-[11px]">
            The Meridian Media Group
          </div>
          <p className="text-[11px] text-stone-500">
            Independent global news across technology, science, business, and world affairs.
          </p>
          <div className="pt-2 flex items-center gap-3 text-stone-600 text-[11px]">
            <a href="#newsletter" onClick={onClose} className="hover:underline">Newsletter</a>
            <span>·</span>
            <a href="#editorial-policy" onClick={onClose} className="hover:underline">Editorial Policy</a>
            <span>·</span>
            <a href="#masthead" onClick={onClose} className="hover:underline">Masthead</a>
          </div>
        </div>
      </div>
    </div>
  );
};
