/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Newspaper } from 'lucide-react';
import type { StoryHeroImage } from '../../types/story';

interface StoryHeroProps {
  heroImage?: StoryHeroImage;
  title: string;
  category: string;
  className?: string;
}

export const StoryHero: React.FC<StoryHeroProps> = ({
  heroImage,
  title,
  category,
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (!heroImage?.url || imgFailed) {
    return (
      <figure className={`w-full my-6 sm:my-8 ${className}`}>
        <div className="w-full aspect-[16/9] bg-stone-100 border border-hairline flex flex-col items-center justify-center p-6 text-center text-stone-400">
          <Newspaper className="w-10 h-10 mb-3 opacity-40 text-stone-500" />
          <span className="text-xs uppercase font-sans font-semibold tracking-widest text-stone-500">
            {category} Coverage
          </span>
          <p className="text-xs font-serif italic text-stone-400 mt-1 max-w-md">
            Editorial archival photography pending verification.
          </p>
        </div>
      </figure>
    );
  }

  return (
    <figure className={`w-full my-6 sm:my-8 ${className}`}>
      <div className="relative overflow-hidden bg-stone-100 aspect-[16/9] w-full border border-hairline-subtle shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <img
          src={heroImage.url}
          alt={heroImage.alt || title}
          loading="eager"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      </div>

      {(heroImage.caption || heroImage.credit) && (
        <figcaption className="mt-2.5 px-0.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-xs text-stone-600 leading-normal">
          {heroImage.caption && (
            <span className="font-serif italic text-stone-600">{heroImage.caption}</span>
          )}
          {heroImage.credit && (
            <span className="not-italic text-[11px] font-sans text-stone-400 uppercase tracking-wide shrink-0">
              Photo: {heroImage.credit}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
};
