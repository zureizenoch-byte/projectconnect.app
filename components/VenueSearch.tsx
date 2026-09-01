'use client';
import { useState, useEffect, useRef } from 'react';
import { loadGoogleMaps } from '@/lib/googleMaps';

type Suggestion = {
  key: string;
  name: string;
  address: string;
  saved?: boolean;
  venueId?: string;
  placeId?: string;
};

/**
 * Venue search. Uses Google Places Autocomplete when a key is configured,
 * and falls back to Photon (OpenStreetMap) when it is not — so the field
 * always works, with or without billing set up.
 */
export function VenueSearch({
  venues, city, onPick,
}: {
  venues: { id: string; name: string; address?: string }[];
  city: string;
  onPick: (v: { venueId: string | null; name: string; address: string; lat?: number; lng?: number; placeId?: string }) => void;
}) {
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Suggestion | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const sessionToken = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((ok) => {
        if (cancelled || !ok) return;
        const g = (window as any).google;
        // the new Places classes are required; fall back quietly if absent
        if (!g?.maps?.places?.AutocompleteSuggestion) return;
        try {
          sessionToken.current = new g.maps.places.AutocompleteSessionToken();
          setGoogleReady(true);
        } catch { /* keep the fallback */ }
      })
      .catch(() => { /* keep the fallback */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) { setRemote([]); setLoading(false); return; }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        if (googleReady) {
          const g = (window as any).google;
          const { suggestions } = await g.maps.places.AutocompleteSuggestion
            .fetchAutocompleteSuggestions({
              input: q,
              sessionToken: sessionToken.current,
              includedRegionCodes: ['ca'],
              locationBias: undefined,
            });

          if (cancelled) return;
          const items: Suggestion[] = (suggestions ?? [])
            .filter((s: any) => s.placePrediction)
            .slice(0, 6)
            .map((s: any, i: number) => {
              const p = s.placePrediction;
              return {
                key: 'g' + i + p.placeId,
                name: p.mainText?.text ?? p.text?.text ?? q,
                address: p.secondaryText?.text ?? p.text?.text ?? '',
                placeId: p.placeId,
              };
            });
          setRemote(items);
        } else {
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
        }
      } catch {
        if (!cancelled) setRemote([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, city, googleReady]);

  const q = query.trim().toLowerCase();
  const savedMatches: Suggestion[] = venues
    .filter((v) => !q || v.name.toLowerCase().includes(q) || (v.address ?? '').toLowerCase().includes(q))
    .slice(0, 4)
    .map((v) => ({ key: 's' + v.id, name: v.name, address: v.address ?? '', saved: true, venueId: v.id }));

  const choose = async (s: Suggestion) => {
    setPicked(s);
    setQuery('');
    setOpen(false);

    // Google gives us the canonical address and coordinates on request
    if (s.placeId && googleReady) {
      try {
        const g = (window as any).google;
        const place = new g.maps.places.Place({ id: s.placeId });
        await place.fetchFields({
          fields: [
            'displayName', 'formattedAddress', 'location',
            'websiteURI', 'nationalPhoneNumber', 'photos',
          ],
        });
        const address = place.formattedAddress ?? s.address;
        const name = place.displayName ?? s.name;
        setPicked({ ...s, name, address });
        onPick({
          venueId: null, name, address,
          lat: place.location?.lat(), lng: place.location?.lng(),
          placeId: s.placeId,
          // Places never exposes an email, but these make finding one quick
          website: place.websiteURI ?? null,
          phone: place.nationalPhoneNumber ?? null,
          // the venue's own photograph, if they have one on Google
          photoUrl: place.photos?.[0]
            ? place.photos[0].getURI({ maxWidth: 800, maxHeight: 500 })
            : null,
        });
        sessionToken.current = new g.maps.places.AutocompleteSessionToken();
        return;
      } catch { /* fall through to the prediction text */ }
    }

    onPick({ venueId: s.venueId ?? null, name: s.name, address: s.address, placeId: s.placeId });
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
          boxShadow: 'var(--sh-lg)', overflow: 'hidden', maxHeight: 340, overflowY: 'auto',
        }}>
          {savedMatches.length > 0 && (
            <>
              <p className="eyebrow" style={{ padding: '10px 16px 6px', margin: 0 }}>Your venues</p>
              {savedMatches.map((s) => <Row key={s.key} s={s} onPick={choose} />)}
            </>
          )}

          {query.trim().length >= 3 && (
            <>
              <p className="eyebrow" style={{ padding: '12px 16px 6px', margin: 0 }}>
                {loading ? 'Searching…' : googleReady ? 'Google Places' : 'Places'}
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

          {googleReady && (
            <p className="mute" style={{
              padding: '8px 16px', margin: 0, fontSize: 12, borderTop: '1px solid var(--line)',
            }}>Powered by Google</p>
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
      {s.address && (
        <span className="mute" style={{ display: 'block', fontSize: 13.5, marginTop: 1 }}>
          {s.address}
        </span>
      )}
    </button>
  );
}
