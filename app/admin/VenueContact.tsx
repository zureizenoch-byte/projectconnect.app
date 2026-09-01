'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveVenueContact, resendVenueNotice } from '@/app/actions/venueNotify';

/** Contact details for a venue, plus the state of any notice we have sent. */
export function VenueContact({ venue, notices }: { venue: any; notices: any[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const mine = notices.filter((n) => n.venue_id === venue.id);
  const sent = mine.filter((n) => n.status === 'sent').length;
  const stuck = mine.filter((n) => n.status === 'queued' || n.status === 'failed');

  const say = (text: string, bad: boolean) => { setMsg(text); setIsError(bad); };

  return (
    <div style={{ marginTop: 6 }}>
      <div className="row" style={{ gap: 8 }}>
        {venue.contact_email ? (
          <span className="mute small">
            {venue.notify ? '\u2709 ' : '\u2298 '}{venue.contact_email}
          </span>
        ) : (
          <span className="small" style={{ color: 'var(--err)' }}>No contact email</span>
        )}
        <button type="button" className="btn btn-quiet" disabled={pending}
          style={{ minHeight: 28, padding: '0 8px', fontSize: 12.5 }}
          onClick={() => setOpen(!open)}>
          {open ? 'Close' : venue.contact_email ? 'Edit' : 'Add'}
        </button>
      </div>

      {(sent > 0 || stuck.length > 0) && (
        <div className="row" style={{ gap: 6, marginTop: 4 }}>
          {sent > 0 && (
            <span className="pill pill-ok" style={{ fontSize: 10 }}>
              {sent} notified
            </span>
          )}
          {stuck.length > 0 && (
            <>
              <span className="pill" style={{
                fontSize: 10, background: '#fff1f0', color: 'var(--err)',
              }}>
                {stuck.length} {stuck[0].status}
              </span>
              <button type="button" className="btn btn-quiet" disabled={pending}
                style={{ minHeight: 26, padding: '0 8px', fontSize: 12 }}
                onClick={() => start(async () => {
                  for (const n of stuck) {
                    const res: any = await resendVenueNotice(n.event_id);
                    if (res?.error) { say(res.error, true); return; }
                    say(res?.ok ?? 'Sent.', false);
                  }
                  router.refresh();
                })}>Resend</button>
            </>
          )}
        </div>
      )}

      {open && (
        <form style={{
          marginTop: 10, padding: 14, borderRadius: 12,
          background: 'var(--gold-100)', border: '1px solid var(--gold-200)',
        }}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set('venue_id', venue.id);
            start(async () => {
              const res: any = await saveVenueContact(fd);
              if (res?.error) say(res.error, true);
              else { say(res.ok, false); setOpen(false); router.refresh(); }
            });
          }}>
          <label className="fld" style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>Contact email</span>
            <input name="contact_email" type="email" defaultValue={venue.contact_email ?? ''}
              placeholder="manager@coffeeshop.com" style={{ minHeight: 38, fontSize: 14 }} />
          </label>
          <label className="fld" style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>Contact name (optional)</span>
            <input name="contact_name" defaultValue={venue.contact_name ?? ''}
              placeholder="Dana" style={{ minHeight: 38, fontSize: 14 }} />
          </label>
          <label className="row" style={{ gap: 8, marginBottom: 12 }}>
            <input type="checkbox" name="notify" defaultChecked={venue.notify ?? true} />
            <span className="small">Email this venue when a meetup is scheduled here</span>
          </label>
          <button className="btn btn-primary" type="submit" disabled={pending}
            style={{ minHeight: 36, padding: '0 14px', fontSize: 13.5 }}>
            {pending ? 'Saving\u2026' : 'Save contact'}
          </button>
        </form>
      )}

      {msg && (
        <p className={isError ? 'err' : 'hint'} style={{ fontSize: 12.5, marginTop: 6 }}>{msg}</p>
      )}
    </div>
  );
}
