/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Share2, Check, Bookmark, Mail } from 'lucide-react';

interface ShareControlsProps {
  title: string;
  url?: string;
  className?: string;
}

export const ShareControls: React.FC<ShareControlsProps> = ({
  title,
  url,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const shareOnX = () => {
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      title
    )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(xUrl, '_blank', 'noopener,noreferrer');
  };

  const shareOnLinkedIn = () => {
    const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      shareUrl
    )}`;
    window.open(liUrl, '_blank', 'noopener,noreferrer');
  };

  const shareByEmail = () => {
    const mailto = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
      `Read this story on The Meridian:\n\n${title}\n\n${shareUrl}`
    )}`;
    window.location.href = mailto;
  };

  return (
    <div
      aria-label="Article sharing and bookmarking options"
      className={`flex items-center gap-1.5 sm:gap-2 ${className}`}
    >
      {/* Copy Link Button with dynamic feedback */}
      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-stone-200 hover:border-stone-400 text-xs font-sans text-stone-700 hover:text-stone-900 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
        title="Copy article link"
        aria-label="Copy story link to clipboard"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-700 font-medium">Link Copied</span>
          </>
        ) : (
          <>
            <Share2 className="w-3.5 h-3.5 text-stone-500" />
            <span>Copy Link</span>
          </>
        )}
      </button>

      {/* Share on X */}
      <button
        type="button"
        onClick={shareOnX}
        className="p-1.5 bg-white border border-stone-200 hover:border-stone-400 text-stone-600 hover:text-stone-900 text-xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
        title="Share on X (Twitter)"
        aria-label="Share story on X"
      >
        <span className="font-sans font-bold text-xs px-1">𝕏</span>
      </button>

      {/* Share on LinkedIn */}
      <button
        type="button"
        onClick={shareOnLinkedIn}
        className="p-1.5 bg-white border border-stone-200 hover:border-stone-400 text-stone-600 hover:text-stone-900 text-xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
        title="Share on LinkedIn"
        aria-label="Share story on LinkedIn"
      >
        <span className="font-sans font-bold text-xs px-0.5">in</span>
      </button>

      {/* Share by Email */}
      <button
        type="button"
        onClick={shareByEmail}
        className="p-1.5 bg-white border border-stone-200 hover:border-stone-400 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
        title="Email story"
        aria-label="Email this story"
      >
        <Mail className="w-3.5 h-3.5 text-stone-500" />
      </button>

      {/* Bookmark toggle */}
      <button
        type="button"
        onClick={() => setBookmarked(!bookmarked)}
        className={`p-1.5 border transition-colors cursor-pointer ml-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 ${
          bookmarked
            ? 'bg-stone-900 border-stone-900 text-white'
            : 'bg-white border-stone-200 hover:border-stone-400 text-stone-600 hover:text-stone-900'
        }`}
        title={bookmarked ? 'Saved to bookmarks' : 'Save for later'}
        aria-label={bookmarked ? 'Story bookmarked' : 'Bookmark story'}
        aria-pressed={bookmarked}
      >
        <Bookmark className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
