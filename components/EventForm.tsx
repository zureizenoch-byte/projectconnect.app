'use client';
import { useState, useTransition } from 'react';
import { createEvent } from '@/app/actions/events';

export function EventForm({ kind, chapters, venues }: {
  kind: 'meetup' | 'talk';
  chapters: { id: string; city: string }[];
  venues: { id: string; name: string; chapter_id: string }[];
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? '');

  return (
    <form className="surf" style={{ padding: 'clamp(20px,3vw,28px)', marginTop: 16 }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const form = e.currentTarget;
        start(async () => {
          const res = await createEvent(fd);
          setMsg(res?.error ?? 'Submitted for admin approval.');
          if (!res?.error) form.reset();
        });
      }}>
      <input type="hidden" name="kind" value={kind} />
      <div className="grid g2">
        <label className="fld"><span>Title</span>
          <input name="title" required maxLength={200} />
        </label>
        <label className="fld"><span>Chapter</span>
          <select name="chapter_id" value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
            {chapters.map((c) => <option key={c.id} value={c.id}>{c.city}</option>)}
          </select>
        </label>
        <label className="fld"><span>Venue</span>
          <select name="venue_id" defaultValue="">
            <option value="">To be confirmed</option>
            {venues.filter((v) => v.chapter_id === chapterId).map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </label>
        <label className="fld"><span>Date and time</span>
          <input name="starts_at" type="datetime-local" required />
        </label>
        <label className="fld"><span>Seats (12–15)</span>
          <input name="seat_cap" type="number" min={12} max={15} defaultValue={15} />
        </label>
      </div>
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
