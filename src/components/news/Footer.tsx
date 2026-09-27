/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CATEGORIES } from '../../data/mockNews';

interface FooterProps {
  onSelectCategory?: (categorySlug: string) => void;
  onOpenPolicyModal?: (policyType: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectCategory, onOpenPolicyModal }) => {
  return (
    <footer className="w-full bg-[#121316] text-stone-300 border-t border-stone-800 font-sans text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Top Brand Banner */}
        <div className="flex flex-col sm:flex-row items-baseline justify-between pb-8 mb-10 border-b border-stone-800 gap-4">
          <div>
            <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white uppercase">
              The Meridian
            </span>
            <p className="text-xs text-stone-400 mt-1 max-w-md">
              Independent global journalism covering artificial intelligence, science, business, computing, and world affairs.
            </p>
          </div>
          <div className="flex items-center gap-3 text-stone-400 text-xs">
            <span>Published daily in London, New York, and Tokyo</span>
          </div>
        </div>

        {/* 4 Multi-Column Editorial Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Column 1: News Sections */}
          <div>
            <h3 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3">
              Sections
            </h3>
            <ul className="space-y-2">
              {CATEGORIES.map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCategory?.(cat.id)}
                    className="text-stone-400 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory?.('opinion')}
                  className="text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  Opinion & Analysis
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Editorial Standards & Trust */}
          <div>
            <h3 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3">
              Editorial Standards
            </h3>
            <ul className="space-y-2 text-stone-400">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicyModal?.('editorial-policy')}
                  className="hover:text-white transition-colors text-left"
                >
                  Editorial Guidelines
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicyModal?.('fact-checking')}
                  className="hover:text-white transition-colors text-left"
                >
                  Fact-Checking Standards
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicyModal?.('corrections')}
                  className="hover:text-white transition-colors text-left"
                >
                  Corrections & Clarifications
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicyModal?.('ethics')}
                  className="hover:text-white transition-colors text-left"
                >
                  Code of Journalistic Ethics
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicyModal?.('masthead')}
                  className="hover:text-white transition-colors text-left"
                >
                  Masthead & Bureau Leadership
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: The Meridian Organization */}
          <div>
            <h3 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3">
              The Organization
            </h3>
            <ul className="space-y-2 text-stone-400">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicyModal?.('about')}
                  className="hover:text-white transition-colors text-left"
                >
                  About The Meridian
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicyModal?.('press')}
                  className="hover:text-white transition-colors text-left"
                >
                  Press Inquiries
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicyModal?.('careers')}
                  className="hover:text-white transition-colors text-left"
                >
                  Careers & Fellowships
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicyModal?.('syndication')}
                  className="hover:text-white transition-colors text-left"
                >
                  Syndication & Permissions
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicyModal?.('contact')}
                  className="hover:text-white transition-colors text-left"
                >
                  Contact Editorial Bureaus
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Privacy, Terms & Accessibility */}
          <div>
            <h3 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3">
              Legal & Compliance
            </h3>
            <ul className="space-y-2 text-stone-400">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicyModal?.('privacy')}
                  className="hover:text-white transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicyModal?.('terms')}
                  className="hover:text-white transition-colors text-left"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicyModal?.('accessibility')}
                  className="hover:text-white transition-colors text-left"
                >
                  Accessibility Statement
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicyModal?.('cookies')}
                  className="hover:text-white transition-colors text-left"
                >
                  Cookie Preferences
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicyModal?.('security')}
                  className="hover:text-white transition-colors text-left"
                >
                  Secure Source Submissions
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Attribution */}
        <div className="pt-8 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between text-stone-500 gap-4">
          <p>© 2026 The Meridian Publishing Group. All rights reserved.</p>
          <p className="text-[11px] text-stone-500">
            Content may not be reproduced, distributed, or transmitted without prior written permission.
          </p>
        </div>
      </div>
    </footer>
  );
};
