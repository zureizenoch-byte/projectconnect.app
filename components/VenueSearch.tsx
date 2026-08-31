'use client';
import { useState, useEffect, useRef } from 'react';

type Suggestion = {
  key: string;
  name: string;
  address: string;
  saved?: boolean;
  venueId?: string;
};

/**
 * Type a place name; suggestions come from this chapter's saved venues first,
 * then real addresses from Photon (OpenStreetMap). No API key required.
 */
export function VenueSearch({
  venues, city, onPick,
}: {
  venues: { id: string; name: string; address?: string }[];
  city: string;
  onPick: (v: { venueId: string | null; name: string; address: string }) => void;
}) {
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Suggestion | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // debounced lookup
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) { setRemote([]); setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const url = 'https://photon.komoot.io/api/?limit=6&lang=en&q='
          + encodeURIComponent(q + ' ' + city);
        const res = await fetch(url);
        const json = await res.json();
        if (cancelled) return;

        const items: Suggestion[] = (json.features ?? []).map((f: any, i: number) => {
          const p = f.properties ?? {};
          const line = [p.housenumber && p.street ? p.housenumber + ' ' + p.street : p.street,
            p.city ?? p.district, p.state, p.country].filter(Boolean).join(', ');
          return {
            key: 'r' + i + (p.osm_id ?? ''),
            name: p.name || p.street || q,
            address: line || p.name || q,
          };
        });
        setRemote(items);
      } catch {
        if (!cancelled) setRemote([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, city]);

  const q = query.trim().toLowerCase();
  const savedMatches: Suggestion[] = venues
    .filter((v) => !q || v.name.toLowerCase().includes(q) || (v.address ?? '').toLowerCase().includes(q))
    .slice(0, 4)
    .map((v) => ({ key: 's' + v.id, name: v.name, address: v.address ?? '', saved: true, venueId: v.id }));

  const choose = (s: Suggestion) => {
    setPicked(s);
    setQuery('');
    setOpen(false);
    onPick({ venueId: s.venueId ?? null, name: s.name, address: s.address });
  };

  const clear = () => {
    setPicked(null);
    setQuery('');
    onPick({ venueId: null, name: '', address: '' });
  };

  if (picked) {
    return (
      <div style={{
        display: 'flex', gap: 14, alignItems: 'center', padding: '14px 16px',
        border: '1px solid var(--gold-200)', borderRadius: 12, background: 'var(--gold-100)',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>{picked.name}</p>
          <p className="mute" style={{ margin: '2px 0 0', fontSize: 14.5 }}>{picked.address}</p>
          {picked.saved && <span className="pill pill-ok" style={{ marginTop: 6 }}>Saved venue</span>}
        </div>
        <button type="button" className="btn btn-out" onClick={clear}
          style={{ minHeight: 36, padding: '0 14px', fontSize: 13.5 }}>Change</button>
      </div>
    );
  }

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={'Search a place in ' + city + '…'}
        style={{
          width: '100%', minHeight: 46, padding: '11px 14px',
          font: 'inherit', fontSize: 16, background: '#fff',
          border: '1px solid var(--line)', borderRadius: 12,
        }} />

      {open && (query.length > 0 || savedMatches.length > 0) && (
        <div style={{
          position: 'absolute', zIndex: 40, left: 0, right: 0, top: 'calc(100% + 6px)',
          background: '#fff', border: '1px solid var(--line)', borderRadius: 12,
          boxShadow: 'var(--sh-lg)', overflow: 'hidden', maxHeight: 320, overflowY: 'auto',
        }}>
          {savedMatches.length > 0 && (
            <>
              <p className="eyebrow" style={{ padding: '10px 16px 6px', margin: 0 }}>Your venues</p>
              {savedMatches.map((s) => (
                <Row key={s.key} s={s} onPick={choose} />
              ))}
            </>
          )}

          {query.trim().length >= 3 && (
            <>
              <p className="eyebrow" style={{ padding: '12px 16px 6px', margin: 0 }}>
                {loading ? 'Searching…' : 'Places'}
              </p>
              {remote.map((s) => <Row key={s.key} s={s} onPick={choose} />)}
              {!loading && remote.length === 0 && (
                <p className="mute small" style={{ padding: '8px 16px 14px', margin: 0 }}>
                  Nothing found. Use the exact address below.
                </p>
              )}
            </>
          )}

          {query.trim().length > 0 && (
            <button type="button"
              onClick={() => choose({ key: 'manual', name: query.trim(), address: query.trim() })}
              style={{
                display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                padding: '12px 16px', border: 0, borderTop: '1px solid var(--line)',
                background: '#fcfcff', font: 'inherit', fontSize: 15, color: 'var(--gold-700)',
              }}>
              Use “{query.trim()}” as typed
            </button>
          )}

          {query.trim().length > 0 && query.trim().length < 3 && (
            <p className="mute small" style={{ padding: '10px 16px', margin: 0 }}>
              Keep typing to search places…
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ s, onPick }: { s: Suggestion; onPick: (s: Suggestion) => void }) {
  return (
    <button type="button" onClick={() => onPick(s)}
      style={{
        display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
        padding: '10px 16px', border: 0, background: 'transparent', font: 'inherit',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gold-100)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
      <span style={{ display: 'block', fontSize: 15.5, fontWeight: 500, color: 'var(--ink)' }}>
        {s.name}
      </span>
      <span className="mute" style={{ display: 'block', fontSize: 13.5, marginTop: 1 }}>
        {s.address}
      </span>
    </button>
  );
}
