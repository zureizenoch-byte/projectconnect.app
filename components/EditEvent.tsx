'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { editEvent } from '@/app/actions/eventLifecycle';

/**
 * Correcting an event, as distinct from moving or cancelling it. Collapsed by
 * default so the page still reads as an event rather than a form.
 */
export function EditEvent({ event, venues = [] }: {
  event: any;
  venues?: { id: string; name: string; chapter_id: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [when, setWhen] = useState('');
  const [format, setFormat] = useState<'in_person' | 'online'>(
    event.format === 'online' ? 'online' : 'in_person');

  const online = format === 'online';

  // The offset must be read in the browser: during server rendering the zone is
  // UTC, which would drop the wrong time into the field.
  const [localStart, setLocalStart] = useState('');
  useEffect(() => {
    const t = new Date(event.starts_at);
    const local = new Date(t.getTime() - t.getTimezoneOffset() * 60000);
    setLocalStart(local.toISOString().slice(0, 16));
  }, [event.starts_at]);

  if (!open) {
    return (
      <button type="button" className="btn btn-out" onClick={() => setOpen(true)}
        style={{ minHeight: 40, padding: '0 16px', fontSize: 14 }}>
        Edit details
      </button>
    );
  }

  return (
    <form
      style={{
        marginTop: 14, padding: 20, borderRadius: 14, textAlign: 'left',
        border: '1px solid var(--gold-200)', background: 'var(--gold-100)',
      }}
      onKeyDown={(e) => {
        const el = e.target as HTMLElement;
        if (e.key === 'Enter' && el.tagName !== 'TEXTAREA' && el.getAttribute('type') !== 'submit') {
          e.preventDefault();
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set('event_id', event.id);
        fd.set('format', format);
        start(async () => {
          const res: any = await editEvent(fd);
          if (res?.error) { setIsError(true); setMsg(res.error); }
          else { setIsError(false); setMsg(res.ok); setOpen(false); router.refresh(); }
        });
      }}>

      <p className="eyebrow" style={{ marginBottom: 14 }}>Edit this event</p>

      <label className="fld"><span>Title</span>
        <input name="title" defaultValue={event.title} required maxLength={200} />
      </label>

      <label className="fld"><span>Description</span>
        <textarea name="description" defaultValue={event.description ?? ''} maxLength={4000} />
      </label>

      <div className="grid g2">
        <label className="fld"><span>Date and time</span>
          <input name="starts_at" type="datetime-local" required
            value={when || localStart}
            onChange={(e) => setWhen(e.target.value)} />
          <span className="hint">
            {when
              ? new Date(when).toLocaleString('en-CA', {
                  weekday: 'long', month: 'long', day: 'numeric',
                  hour: 'numeric', minute: '2-digit', timeZoneName: 'long',
                })
              : 'Your time zone (' + Intl.DateTimeFormat().resolvedOptions().timeZone + ').'}
            {' '}Change this and everyone holding a seat is told.
          </span>
        </label>
        <label className="fld"><span>Seats</span>
          <input name="seat_cap" type="number" min={2} max={online ? 100 : 15}
            defaultValue={event.seat_cap} key={format} />
        </label>
      </div>

      <fieldset style={{ border: 0, padding: 0, margin: '0 0 18px' }}>
        <legend style={{ fontSize: 17.5, fontWeight: 600, marginBottom: 10 }}>Where it happens</legend>
        <div className="row" style={{ gap: 10 }}>
          {([['in_person', 'In person'], ['online', 'Online']] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setFormat(value)}
              style={{
                flex: '1 1 160px', cursor: 'pointer', padding: '12px 16px', borderRadius: 12,
                font: 'inherit', fontSize: 15,
                border: '1px solid ' + (format === value ? 'var(--gold)' : 'var(--line)'),
                background: format === value ? '#fff' : 'transparent',
                color: 'var(--ink)',
              }}>{label}</button>
          ))}
        </div>
      </fieldset>

      {online ? (
        <>
          <label className="fld"><span>Meeting link</span>
            <input name="meeting_url" type="url" defaultValue={event.meeting_url ?? ''}
              placeholder="https://meet.google.com/…" />
          </label>
          <label className="fld"><span>Joining note</span>
            <input name="meeting_note" defaultValue={event.meeting_note ?? ''} maxLength={300}
              placeholder="Passcode, dial-in, or how early to join" />
          </label>
        </>
      ) : venues.length > 0 ? (
        <label className="fld"><span>Venue</span>
          <select name="venue_id" defaultValue={event.venue_id ?? ''}>
            <option value="">To be confirmed</option>
            {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
      ) : null}

      {msg && (
        <p className={isError ? 'err' : 'hint'} style={!isError ? { color: 'var(--ok)' } : undefined}>
          {msg}
        </p>
      )}

      <div className="row" style={{ gap: 8, marginTop: 4 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}
          style={{ minHeight: 42, padding: '0 20px', fontSize: 14.5 }}>
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <button className="btn btn-quiet" type="button" onClick={() => { setOpen(false); setMsg(null); }}
          style={{ minHeight: 42, padding: '0 14px', fontSize: 14.5 }}>Cancel</button>
      </div>
    </form>
  );
}
