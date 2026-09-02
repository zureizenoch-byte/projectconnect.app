'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

const CHAPTERS: [string, string][] = [
  ['All', ''],
  ['Vancouver', 'Vancouver'],
  ['Toronto', 'Toronto'],
];

const TYPES: [string, string][] = [
  ['Everything', ''],
  ['Meetups', 'meetup'],
  ['Speaker Series', 'talk'],
];

/**
 * Filters apply in place — no page navigation, no scroll jump. The URL still
 * carries the state, so a filtered view stays shareable and survives reload.
 */
export function EventFilters({
  city, kind, count,
}: { city?: string; kind?: string; count: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const go = (next: { city?: string; kind?: string }) => {
    const params = new URLSearchParams();
    const c = 'city' in next ? next.city : city;
    const k = 'kind' in next ? next.kind : kind;
    if (c) params.set('city', c);
    if (k) params.set('kind', k);
    const qs = params.toString();
    start(() => router.replace('/events' + (qs ? '?' + qs : ''), { scroll: false }));
  };

  return (
    <div className="filterpanel" data-pending={pending ? 'true' : undefined}>
      <div>
        <span className="eyebrow" style={{ marginBottom: 10 }}>Chapter</span>
        <div className="filtercol">
          {CHAPTERS.map(([label, value]) => (
            <button key={label} type="button" className="filteropt"
              aria-pressed={(city ?? '') === value}
              onClick={() => go({ city: value })}>{label}</button>
          ))}
        </div>
      </div>

      <div>
        <span className="eyebrow" style={{ marginBottom: 10 }}>Type</span>
        <div className="filtercol">
          {TYPES.map(([label, value]) => (
            <button key={label} type="button" className="filteropt"
              aria-pressed={(kind ?? '') === value}
              onClick={() => go({ kind: value })}>{label}</button>
          ))}
        </div>
      </div>

      {(city || kind) && (
        <div className="filterfoot">
          <span className="mute small">
            {pending
              ? 'Updating…'
              : count + ' ' + (count === 1 ? 'event' : 'events')
                + (city ? ' in ' + city : '')
                + (kind ? (kind === 'talk' ? ' · Speaker Series' : ' · Meetups') : '')}
          </span>
          <button type="button" className="btn btn-quiet"
            style={{ marginLeft: 'auto', minHeight: 34, padding: '0 12px', fontSize: 14 }}
            onClick={() => go({ city: '', kind: '' })}>Clear filters</button>
        </div>
      )}
    </div>
  );
}
