'use client';

import { useEffect, useRef } from 'react';

/**
 * Lands the thread on the newest message rather than the oldest.
 *
 * Jumps without animation on first paint, so it reads as "this is where the
 * conversation is" rather than a scroll the reader has to watch. Later arrivals
 * glide, and only if the reader is already near the bottom — nobody wants to be
 * yanked away from something they are reading further up.
 */
export function ScrollToLatest({ count }: { count: number }) {
  const anchor = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const el = anchor.current;
    if (!el) return;

    const jump = (smooth: boolean) => {
      const y = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
    };

    if (first.current) {
      first.current = false;
      // wait for images and fonts to settle so the position is not stale
      requestAnimationFrame(() => requestAnimationFrame(() => jump(false)));
      return;
    }

    const nearBottom =
      window.innerHeight + window.scrollY > document.body.offsetHeight - 260;
    if (nearBottom) jump(true);
  }, [count]);

  return <div ref={anchor} aria-hidden style={{ scrollMarginBottom: 120 }} />;
}
