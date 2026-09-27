/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';

interface ReadingProgressProps {
  targetId?: string;
}

export const ReadingProgress: React.FC<ReadingProgressProps> = ({ targetId = 'article-body' }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const element = document.getElementById(targetId);
      if (!element) {
        // Fallback to entire page scroll
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (totalHeight > 0) {
          const current = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
          setProgress(current);
        }
        return;
      }

      const rect = element.getBoundingClientRect();
      const elementTop = rect.top + window.scrollY;
      const elementHeight = rect.height;
      const windowHeight = window.innerHeight;

      // Start calculating when the top of the element reaches the viewport top
      const scrollY = window.scrollY;
      const start = elementTop - 120; // 120px offset for header
      const end = start + elementHeight - windowHeight;

      if (scrollY <= start) {
        setProgress(0);
      } else if (scrollY >= end) {
        setProgress(100);
      } else {
        const percent = ((scrollY - start) / (end - start)) * 100;
        setProgress(Math.min(100, Math.max(0, percent)));
      }
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
    updateProgress();

    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [targetId]);

  return (
    <div
      role="progressbar"
      aria-label="Article reading progress"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="fixed top-0 left-0 right-0 h-[2.5px] z-50 bg-stone-200/40 pointer-events-none"
    >
      <div
        className="h-full bg-red-900 transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
