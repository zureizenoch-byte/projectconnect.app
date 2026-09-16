'use client';

import { useEffect, useState } from 'react';
import { Avatar } from '@/components/Avatar';

/**
 * A profile photograph worth looking at properly.
 *
 * Tapping opens the full image over a dimmed page — Escape, the backdrop or the
 * close button dismiss it. With no photo there is nothing to enlarge, so the
 * initials stay a plain, non-interactive avatar.
 */
export function AvatarZoom({
  src, name, email, size, ring,
}: {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size: number;
  ring?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (!src) return <Avatar src={null} name={name} email={email} size={size} ring={ring} />;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        aria-label={'View ' + (name ? name + "'s" : '') + ' photo full size'}
        style={{
          padding: 0, border: 0, background: 'none', cursor: 'zoom-in',
          borderRadius: '50%', lineHeight: 0, display: 'inline-block',
          WebkitTapHighlightColor: 'transparent',
        }}>
        <Avatar src={src} name={name} email={email} size={size} ring={ring} />
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Profile photo"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'grid', placeItems: 'center',
            padding: 'clamp(16px,5vw,48px)',
            background: 'rgba(13,19,48,.86)',
            backdropFilter: 'blur(3px)',
            animation: 'pcFade .16s ease-out',
          }}>
          <img src={src} alt={name ?? 'Profile photo'}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'block', maxWidth: 'min(560px, 100%)', maxHeight: '86vh',
              width: 'auto', height: 'auto', objectFit: 'contain',
              borderRadius: 18, background: '#fff',
              boxShadow: '0 30px 80px -28px rgba(0,0,0,.6)',
            }} />

          <button type="button" onClick={() => setOpen(false)} aria-label="Close"
            style={{
              position: 'fixed', top: 'max(16px, env(safe-area-inset-top))', right: 16,
              width: 44, height: 44, borderRadius: '50%', cursor: 'pointer',
              border: '1px solid rgba(255,255,255,.28)',
              background: 'rgba(255,255,255,.12)', color: '#fff',
              font: 'inherit', fontSize: 22, lineHeight: 1,
            }}>×</button>
        </div>
      )}
    </>
  );
}
