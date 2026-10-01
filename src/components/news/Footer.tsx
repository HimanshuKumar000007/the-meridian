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
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-12">
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
                <a
                  href="/editorial-policy"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState(null, '', '/editorial-policy');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hover:text-white transition-colors text-left block"
                >
                  Editorial Guidelines & AI
                </a>
              </li>
              <li>
                <a
                  href="/editorial-policy"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState(null, '', '/editorial-policy');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hover:text-white transition-colors text-left block"
                >
                  Fact-Checking Standards
                </a>
              </li>
              <li>
                <a
                  href="/corrections"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState(null, '', '/corrections');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hover:text-white transition-colors text-left block"
                >
                  Corrections & Clarifications
                </a>
              </li>
              <li>
                <a
                  href="/ethics"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState(null, '', '/ethics');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hover:text-white transition-colors text-left block"
                >
                  Code of Journalistic Ethics
                </a>
              </li>
              <li>
                <a
                  href="/masthead"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState(null, '', '/masthead');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hover:text-white transition-colors text-left block"
                >
                  Masthead & Bureau Leadership
                </a>
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
                <a
                  href="/about"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState(null, '', '/about');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hover:text-white transition-colors text-left block"
                >
                  About The Meridian
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState(null, '', '/contact');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hover:text-white transition-colors text-left block"
                >
                  Contact Editorial Bureaus
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState(null, '', '/about');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hover:text-white transition-colors text-left block"
                >
                  Press & Fellowships
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState(null, '', '/terms');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hover:text-white transition-colors text-left block"
                >
                  Syndication & Permissions
                </a>
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
                <a
                  href="/privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState(null, '', '/privacy');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hover:text-white transition-colors text-left block"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState(null, '', '/terms');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hover:text-white transition-colors text-left block"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="/editorial-policy"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState(null, '', '/editorial-policy');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="hover:text-white transition-colors text-left block"
                >
                  Accessibility & Compliance
                </a>
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
