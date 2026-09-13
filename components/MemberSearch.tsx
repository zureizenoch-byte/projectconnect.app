'use client';

import { useEffect, useRef, useState } from 'react';

type Hit = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  role_level: string | null;
  city: string | null;
};

/**
 * Member search in the header. Opens a results panel under the field as you
 * type — fast enough to use as a jump-to rather than a search page you land on.
 */
export function MemberSearch() {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // close on an outside click or Escape
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

  // debounced, and aborts the previous request so results cannot arrive out of order
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setHits([]); setLoading(false); return; }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/members/search?q=' + encodeURIComponent(q), {
          signal: controller.signal,
        });
        const data = await res.json();
        setHits(data.members ?? []);
      } catch {
        // aborted or offline — leave the previous results in place
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={boxRef} className="membersearch">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search members"
        aria-label="Search members"
        style={{
          width: '100%', minHeight: 38, padding: '0 12px',
          border: '1px solid var(--line)', borderRadius: 11,
          font: 'inherit', fontSize: 14.5, background: '#fff', color: 'var(--ink)',
        }} />

      {showPanel && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 40,
          background: '#fff', border: '1px solid var(--line)', borderRadius: 14,
          boxShadow: 'var(--sh-lg)', overflow: 'hidden', maxHeight: 360, overflowY: 'auto',
        }}>
          {loading && !hits.length && (
            <p className="mute small" style={{ margin: 0, padding: '14px 16px' }}>Searching…</p>
          )}

          {!loading && !hits.length && (
            <p className="mute small" style={{ margin: 0, padding: '14px 16px' }}>
              No members found for “{query.trim()}”.
            </p>
          )}

          {hits.map((m) => (
            <a key={m.id} href={'/members/' + m.id}
              onClick={() => setOpen(false)}
              style={{
                display: 'flex', gap: 12, alignItems: 'center', padding: '11px 14px',
                borderBottom: '1px solid var(--line)', textDecoration: 'none', color: 'inherit',
              }}>
              <span style={{
                width: 36, height: 36, borderRadius: '50%', flex: 'none',
                display: 'grid', placeItems: 'center',
                background: m.photo_url ? undefined : 'var(--gold-100)',
                backgroundImage: m.photo_url ? 'url(' + m.photo_url + ')' : undefined,
                backgroundSize: 'cover', backgroundPosition: 'center',
                color: 'var(--gold-700)', fontSize: 14, fontWeight: 600,
              }}>
                {!m.photo_url && (m.full_name?.trim()?.[0]?.toUpperCase() ?? '·')}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 500 }}>
                  {m.full_name ?? 'Member'}
                </span>
                <span className="mute" style={{ display: 'block', fontSize: 13 }}>
                  {[m.role_level, m.city].filter(Boolean).join(' · ') || 'Member'}
                </span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
