'use client';

import { useEffect } from 'react';

/**
 * Lands on the newest message rather than the bottom of the document.
 *
 * Scrolling the window to its full height overshoots — past the composer and
 * into the footer. This positions the last bubble just above the composer, so
 * the latest message is what you actually see on arrival.
 */
export function ScrollToLatest({ count }: { count: number }) {
  useEffect(() => {
    if (!count) return;

    const settle = () => {
      const last = document.getElementById('latest-message');
      if (!last) return;

      const composer = document.getElementById('composer');
      const gap = (composer?.offsetHeight ?? 0) + 24;

      const target = last.getBoundingClientRect().bottom + window.scrollY + gap
        - window.innerHeight;

      window.scrollTo({
        top: Math.max(0, target),
        behavior: 'auto',
      });
    };

    // after layout, and again once fonts and avatars have settled the height
    requestAnimationFrame(settle);
    const t = setTimeout(settle, 220);
    return () => clearTimeout(t);
  }, [count]);

  return null;
}
