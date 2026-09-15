'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The account menu behind the avatar.
 *
 * The header had grown to a brand, a search field, eight nav links, a bell and
 * three separate account controls — more than one row can hold. Folding the
 * profile links behind the avatar gives the row back its shape.
 */
export function AccountMenu({
  name, email, profileId, children, signOutAction,
}: {
  name: string | null;
  email: string;
  profileId: string;
  children: React.ReactNode;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const item: React.CSSProperties = {
    display: 'block', padding: '15px 16px', fontSize: 15.5, lineHeight: 1.3,
    color: 'var(--ink)', textDecoration: 'none', background: 'none',
    border: 0, width: '100%', textAlign: 'left', cursor: 'pointer',
    font: 'inherit', minHeight: 50,
  };

  return (
    <div ref={boxRef} style={{ position: 'relative', lineHeight: 0 }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        aria-expanded={open} aria-haspopup="menu"
        aria-label={name ? 'Account menu for ' + name : 'Account menu'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 0,
          padding: 0, border: 0, background: 'none', cursor: 'pointer', lineHeight: 0,
          borderRadius: '50%',
        }}>
        {children}
      </button>

      {open && (
        <div role="menu" style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 50,
          minWidth: 224, background: '#fff', border: '1px solid var(--line)',
          borderRadius: 14, boxShadow: 'var(--sh-lg)', overflow: 'hidden',
        }}>
          <a href={'/members/' + profileId} onClick={() => setOpen(false)}
            style={{
              display: 'block', padding: '14px 16px', textDecoration: 'none',
              color: 'inherit', borderBottom: '1px solid var(--line)',
            }}>
            <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, lineHeight: 1.3 }}>
              {name ?? 'Your account'}
            </p>
            <p className="mute" style={{
              margin: '2px 0 0', fontSize: 12.5, lineHeight: 1.4,
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{email}</p>
            <p style={{
              margin: '6px 0 0', fontSize: 12.5, fontWeight: 600,
              letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gold-700)',
            }}>View my profile</p>
          </a>

          <a href="/profile" style={item} onClick={() => setOpen(false)}>Edit profile</a>

          <form action={signOutAction} style={{ borderTop: '1px solid var(--line)' }}>
            <button type="submit" style={{ ...item, color: 'var(--err)' }}>Sign out</button>
          </form>
        </div>
      )}
    </div>
  );
}
