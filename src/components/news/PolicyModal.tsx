/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface PolicyModalProps {
  policyType: string | null;
  onClose: () => void;
}

interface PolicyContent {
  title: string;
  subtitle: string;
  sections: { heading: string; body: string }[];
}

const POLICY_DATA: Record<string, PolicyContent> = {
  'editorial-policy': {
    title: 'Editorial Principles & Independence',
    subtitle: 'Standards governing our reporting, sources, and analytical rigor',
    sections: [
      {
        heading: '1. Commitment to Factual Verification',
        body: 'Every assertion of fact published by The Meridian undergoes independent verification by at least two distinct, credible sources or direct primary documentary evidence. Reporters do not speculate on unverified rumors.',
      },
      {
        heading: '2. Editorial Independence',
        body: 'The Meridian operates with absolute editorial autonomy. No commercial sponsor, investor, or institutional partner exercises influence over our news judgment, beat assignments, or headline construction.',
      },
      {
        heading: '3. Conflicts of Interest & Disclosures',
        body: 'Journalists are prohibited from holding direct financial interests, advisory roles, or non-public equities in companies or entities within their coverage beats. Any relevant institutional affiliations are explicitly disclosed in the byline deck.',
      },
    ],
  },
  'fact-checking': {
    title: 'Fact-Checking & Research Standards',
    subtitle: 'Methodology and verification protocols for primary reporting',
    sections: [
      {
        heading: 'Primary Documentation First',
        body: 'Our newsrooms prioritize raw datasets, peer-reviewed scientific filings, regulatory disclosure papers, and on-the-record transcripts over secondary interpretations.',
      },
      {
        heading: 'Scientific & Technical Accuracy',
        body: 'Technical claims involving quantum physics, semiconductor engineering, biotechnology, and economics are audited by specialized subject-matter editors prior to publication.',
      },
      {
        heading: 'Source Corroboration',
        body: 'When background sources request confidentiality due to risk of professional reprisal, their identity and documentation must be reviewed and approved by an executive editor.',
      },
    ],
  },
  corrections: {
    title: 'Corrections & Clarifications Policy',
    subtitle: 'Our transparent protocol for addressing errors promptly and prominently',
    sections: [
      {
        heading: 'Prominent, Permanent Notices',
        body: 'If an error of fact or context occurs, The Meridian immediately appends a transparent correction notice at the top or bottom of the article specifying what was amended, when the change occurred, and the corrected information.',
      },
      {
        heading: 'Submitting a Correction',
        body: 'Readers and subjects of coverage are encouraged to notify the editorial desk at corrections@themeridian.news. Inquiries are audited within four hours during active news cycles.',
      },
    ],
  },
  ethics: {
    title: 'Code of Journalistic Ethics',
    subtitle: 'Integrity, source protection, and fair treatment in global reporting',
    sections: [
      {
        heading: 'Fair Hearing & Right of Reply',
        body: 'Any individual, enterprise, or institution subject to critical allegations is given substantive, reasonable opportunity to respond before publication.',
      },
      {
        heading: 'Protection of Confidential Sources',
        body: 'The Meridian defends the confidentiality of verified whistleblowers and sources using cryptographically secure communication channels.',
      },
    ],
  },
  masthead: {
    title: 'Editorial Masthead & Bureau Leadership',
    subtitle: 'Senior editorial leadership guiding global bureaus',
    sections: [
      {
        heading: 'Executive Leadership',
        body: 'Editor-in-Chief: Evelyn Ross · Managing Editor: David H. Vance · Deputy Editor (Global Affairs): Claire Delacroix · Creative & Visual Director: Marcus Chen.',
      },
      {
        heading: 'Bureau Chiefs',
        body: 'Washington & Americas: Victoria Sterling · London & Europe: Julian Foster · Tokyo & Asia-Pacific: Kenji Takahashi · Science & Deep Tech: Dr. Helen Vance.',
      },
    ],
  },
  about: {
    title: 'About The Meridian',
    subtitle: 'An independent digital publication founded on depth, clarity, and precision',
    sections: [
      {
        heading: 'Our Mission',
        body: 'The Meridian was created to provide a calm, deeply credible antidote to superficial aggregators and clickbait-driven news feeds. We focus on structural changes across technology, deep science, macroeconomics, and global statecraft that will shape the next generation.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy & Data Ethics',
    subtitle: 'Transparent data stewardship without third-party tracking networks',
    sections: [
      {
        heading: 'Minimal Data Collection',
        body: 'The Meridian does not sell personal reading habits or license subscriber telemetry to third-party ad brokers. We believe reading the news is a private civic act.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    subtitle: 'Standard conditions governing reader access and content syndication',
    sections: [
      {
        heading: 'Intellectual Property',
        body: 'All reporting, photography, data visualizations, and commentary published on The Meridian are copyrighted works protected by international copyright conventions.',
      },
    ],
  },
  accessibility: {
    title: 'Accessibility Statement',
    subtitle: 'Commitment to universal readability, semantic HTML, and assistive tech support',
    sections: [
      {
        heading: 'WCAG 2.1 AA Compliance',
        body: 'The Meridian interface is engineered with high-contrast typography, semantic heading hierarchies, full keyboard navigation affordances, visible focus rings, and screen-reader compatibility.',
      },
    ],
  },
};

export const PolicyModal: React.FC<PolicyModalProps> = ({ policyType, onClose }) => {
  useEffect(() => {
    if (policyType) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && policyType) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [policyType, onClose]);

  if (!policyType) return null;

  const content = POLICY_DATA[policyType] || POLICY_DATA['editorial-policy'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={content.title}
    >
      <div
        className="w-full max-w-2xl bg-[#FAF9F6] border border-stone-300 shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-4 border-b border-hairline mb-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-red-900 shrink-0" />
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
                {content.title}
              </h2>
              <p className="text-xs text-stone-500 font-sans mt-0.5">{content.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-500 hover:text-stone-900 focus:outline-none"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 font-sans text-sm text-stone-700 leading-relaxed">
          {content.sections.map((sec, idx) => (
            <div key={idx} className="space-y-1.5">
              <h3 className="font-semibold text-stone-900 font-sans text-sm">
                {sec.heading}
              </h3>
              <p className="text-stone-600 text-xs sm:text-sm">{sec.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-4 border-t border-hairline flex items-center justify-between text-xs text-stone-500 font-sans">
          <span>The Meridian Standards & Practices</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-stone-900 text-white hover:bg-stone-800 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
