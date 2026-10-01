/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, CheckCircle2 } from 'lucide-react';

export const NewsletterSignup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setSubmitted(true);
  };

  return (
    <section
      id="newsletter"
      aria-labelledby="newsletter-heading"
      className="w-full py-12 sm:py-16 bg-[#16171A] text-stone-100 border-t border-stone-800"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3 font-sans">
          <Mail className="w-3.5 h-3.5 text-stone-400" />
          <span>The Morning Dispatch</span>
        </div>

        <h2
          id="newsletter-heading"
          className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-white mb-4 [text-wrap:balance]"
        >
          Get the stories that matter.
        </h2>

        <p className="font-sans text-sm sm:text-base text-stone-300 max-w-xl mx-auto leading-relaxed mb-8">
          A concise morning briefing synthesizing major global developments across technology, science, economics, and international policy. Delivered Monday through Friday.
        </p>

        {!submitted ? (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 max-w-md mx-auto"
            noValidate
          >
            <div className="w-full flex flex-col gap-1">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter your email address"
                required
                className="w-full px-4 py-3 bg-stone-900 border border-stone-700 text-white placeholder:text-stone-500 font-sans text-sm focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-colors"
              />
              {error && (
                <p className="text-xs text-red-400 font-sans text-left">
                  {error}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-white text-stone-900 font-sans font-semibold text-xs tracking-wider uppercase hover:bg-stone-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Subscribe
            </button>
          </form>
        ) : (
          <div className="bg-stone-900 border border-stone-700 p-6 max-w-md mx-auto flex items-center justify-center gap-3 animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-left text-xs font-sans">
              <p className="font-semibold text-white">You are subscribed.</p>
              <p className="text-stone-400">The next briefing will arrive tomorrow at 6:00 AM EST.</p>
            </div>
          </div>
        )}

        <p className="text-[11px] text-stone-500 font-sans mt-8">
          Free of charge. No advertising tracking. You may unsubscribe with a single click at any time.
        </p>
      </div>
    </section>
  );
};
