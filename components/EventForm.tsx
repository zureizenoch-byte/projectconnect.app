'use client';
import { useState, useTransition } from 'react';
import { createEvent } from '@/app/actions/events';
import { mapsUrl } from '@/lib/matching';

export function EventForm({ kind, chapters, venues }: {
  kind: 'meetup' | 'talk';
  chapters: { id: string; city: string }[];
  venues: { id: string; name: string; chapter_id: string; address?: string }[];
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? '');
  const [venueId, setVenueId] = useState('');
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');

  const chapterVenues = venues.filter((v) => v.chapter_id === chapterId);
  const chosen = venues.find((v) => v.id === venueId);
  const isNew = venueId === '__new';

  // whichever address applies right now
  const previewAddress = isNew ? newAddress.trim() : (chosen?.address ?? '');
  const cityName = chapters.find((c) => c.id === chapterId)?.city ?? '';
  const fullAddress = previewAddress && !previewAddress.toLowerCase().includes(cityName.toLowerCase())
    ? previewAddress + ', ' + cityName
    : previewAddress;

  return (
    <form className="surf" style={{ padding: 'clamp(20px,3vw,28px)', marginTop: 16 }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const form = e.currentTarget;
        start(async () => {
          const res = await createEvent(fd);
          setMsg(res?.error ?? 'Submitted for admin approval.');
          if (!res?.error) {
            form.reset();
            setVenueId(''); setNewName(''); setNewAddress('');
          }
        });
      }}>
      <input type="hidden" name="kind" value={kind} />

      <div className="grid g2">
        <label className="fld"><span>Title</span>
          <input name="title" required maxLength={200} />
        </label>
        <label className="fld"><span>Chapter</span>
          <select name="chapter_id" value={chapterId}
            onChange={(e) => { setChapterId(e.target.value); setVenueId(''); }}>
            {chapters.map((c) => <option key={c.id} value={c.id}>{c.city}</option>)}
          </select>
        </label>
        <label className="fld"><span>Date and time</span>
          <input name="starts_at" type="datetime-local" required />
        </label>
        <label className="fld"><span>Seats (12–15)</span>
          <input name="seat_cap" type="number" min={12} max={15} defaultValue={15} />
        </label>
      </div>

      <label className="fld" style={{ marginBottom: 12 }}><span>Venue</span>
        <select name="venue_id" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
          <option value="">To be confirmed</option>
          {chapterVenues.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
          <option value="__new">＋ Add a new venue…</option>
        </select>
        {chosen?.address && (
          <span className="hint">{chosen.address}</span>
        )}
      </label>

      {isNew && (
        <div style={{
          padding: 18, marginBottom: 20, borderRadius: 14,
          border: '1px solid var(--gold-200)', background: 'var(--gold-100)',
        }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>New venue</p>
          <div className="grid g2">
            <label className="fld" style={{ marginBottom: 0 }}><span>Venue name</span>
              <input name="new_venue_name" required={isNew} value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Gastown Room" />
            </label>
            <label className="fld" style={{ marginBottom: 0 }}><span>Street address</span>
              <input name="new_venue_address" required={isNew} value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="300 Water St" />
            </label>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Saved to your chapter's venue list, so you can reuse it next time.
          </p>
        </div>
      )}

      {fullAddress && (
        <div style={{
          marginBottom: 20, borderRadius: 14, overflow: 'hidden',
          border: '1px solid var(--line)',
        }}>
          <iframe
            title="Venue location"
            width="100%" height="220" loading="lazy" style={{ border: 0, display: 'block' }}
            referrerPolicy="no-referrer-when-downgrade"
            src={'https://www.google.com/maps?q=' + encodeURIComponent(fullAddress) + '&output=embed'} />
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
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Submitting…' : kind === 'talk' ? 'Submit talk' : 'Create meetup'}
      </button>
      <p className="hint">Chapter Leads create; an admin approves before it publishes.</p>
    </form>
  );
}
