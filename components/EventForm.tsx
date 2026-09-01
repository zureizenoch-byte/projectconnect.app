'use client';
import { useState, useTransition } from 'react';
import { createEvent } from '@/app/actions/events';
import { mapsUrl } from '@/lib/matching';
import { VenueSearch } from '@/components/VenueSearch';

export function EventForm({ kind, chapters, venues, minSeats = 12, defaultSeats = 15, submitLabel }: {
  kind: 'meetup' | 'talk';
  chapters: { id: string; city: string }[];
  venues: { id: string; name: string; chapter_id: string; address?: string }[];
  minSeats?: number;
  defaultSeats?: number;
  submitLabel?: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? '');
  const [venue, setVenue] = useState<{ venueId: string | null; name: string; address: string }>(
    { venueId: null, name: '', address: '' });
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');

  const ready = title.trim().length > 0 && startsAt.length > 0;

  const chapterVenues = venues.filter((v) => v.chapter_id === chapterId);
  const cityName = chapters.find((c) => c.id === chapterId)?.city ?? '';
  const fullAddress = venue.address && !venue.address.toLowerCase().includes(cityName.toLowerCase())
    ? venue.address + ', ' + cityName
    : venue.address;

  return (
    <form className="surf" style={{ padding: 'clamp(20px,3vw,28px)', marginTop: 16 }}
      onKeyDown={(e) => {
        const el = e.target as HTMLElement;
        if (e.key === 'Enter' && el.tagName !== 'TEXTAREA' && el.getAttribute('type') !== 'submit') {
          e.preventDefault();
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const form = e.currentTarget;
        start(async () => {
          const res = await createEvent(fd);
          setMsg(res?.error ?? 'Submitted for admin approval.');
          if (!res?.error) {
            form.reset();
            setVenue({ venueId: null, name: '', address: '' });
            setTitle(''); setStartsAt('');
          }
        });
      }}>
      <input type="hidden" name="kind" value={kind} />

      <div className="grid g2">
        <label className="fld"><span>Title</span>
          <input name="title" required maxLength={200}
            value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="fld"><span>Chapter</span>
          <select name="chapter_id" value={chapterId}
            onChange={(e) => {
            setChapterId(e.target.value);
            setVenue({ venueId: null, name: '', address: '' });
          }}>
            {chapters.map((c) => <option key={c.id} value={c.id}>{c.city}</option>)}
          </select>
        </label>
        <label className="fld"><span>Date and time</span>
          <input name="starts_at" type="datetime-local" required
            value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          {startsAt && (
            <span className="hint" style={{ color: 'var(--ok)' }}>
              {new Date(startsAt).toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'short' })}
            </span>
          )}
        </label>
        <label className="fld"><span>Seats ({minSeats}–15)</span>
          <input name="seat_cap" type="number" min={minSeats} max={15} defaultValue={defaultSeats} />
        </label>
      </div>

      <div className="fld" style={{ marginBottom: 16 }}>
        <span>Venue</span>
        <VenueSearch venues={chapterVenues} city={cityName} onPick={setVenue} />
        <input type="hidden" name="venue_id" value={venue.venueId ?? (venue.name ? '__new' : '')} />
        <input type="hidden" name="new_venue_name" value={venue.venueId ? '' : venue.name} />
        <input type="hidden" name="new_venue_address" value={venue.venueId ? '' : fullAddress} />
        <span className="hint">
          Type a place name or address. Saved venues appear first; anything new is added to your chapter.
        </span>
      </div>

      {fullAddress && (
        <div style={{
          marginBottom: 20, borderRadius: 14, overflow: 'hidden',
          border: '1px solid var(--line)',
        }}>
          <iframe
            title="Venue location"
            width="100%" height="240" loading="lazy" style={{ border: 0, display: 'block' }}
            referrerPolicy="no-referrer-when-downgrade"
            src={
              process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                ? 'https://www.google.com/maps/embed/v1/place?key='
                  + process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                  + '&q=' + encodeURIComponent(fullAddress) + '&zoom=16'
                : 'https://maps.google.com/maps?q=' + encodeURIComponent(fullAddress) + '&z=16&hl=en&output=embed'
            } />
          <div className="row" style={{ justifyContent: 'space-between', padding: '12px 16px', background: '#fcfcff' }}>
            <span className="mute small">{fullAddress}</span>
            <a className="btn btn-out" href={mapsUrl(fullAddress)} target="_blank" rel="noopener noreferrer"
              style={{ minHeight: 34, padding: '0 14px', fontSize: 13.5 }}>Open in Maps</a>
          </div>
        </div>
      )}

      <label className="fld"><span>Description</span>
        <textarea name="description" maxLength={4000} />
      </label>

      {msg && <p className="hint" style={{ color: msg.startsWith('Submitted') ? 'var(--ok)' : 'var(--err)' }}>{msg}</p>}

      <div style={{
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
        marginTop: 22, paddingTop: 20, borderTop: '1px solid var(--line)',
      }}>
        <button className="btn btn-primary" type="submit" disabled={pending || !ready}
          style={{ minHeight: 48, padding: '0 26px', fontSize: 15.5 }}>
          {pending ? 'Submitting…' : (submitLabel ?? (kind === 'talk' ? 'Submit talk' : 'Create meetup'))}
        </button>

        {ready && (
          <button type="button" className="btn btn-quiet" disabled={pending}
            onClick={() => {
              setTitle(''); setStartsAt('');
              setVenue({ venueId: null, name: '', address: '' });
              setMsg(null);
            }}>Clear</button>
        )}

        <span className="mute" style={{ fontSize: 14, marginLeft: 'auto' }}>
          {ready
            ? (kind === 'talk' ? 'Goes to an admin for approval.' : 'Goes to an admin for approval.')
            : 'Add a title and a date to continue.'}
        </span>
      </div>
    </form>
  );
}
