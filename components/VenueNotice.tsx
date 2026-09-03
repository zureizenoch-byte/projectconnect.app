'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { notifyMyVenue } from '@/app/actions/venueNotify';

export function VenueNotice({ eventId, venueName, status, toEmail, hasContact }: {
  eventId: string; venueName: string;
  status: string | null; toEmail: string | null; hasContact: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const sent = status === 'sent';

  return (
    <div style={{
      marginTop: 18, padding: '14px 16px', borderRadius: 12,
      background: sent ? '#f2faf5' : 'var(--gold-100)',
      border: '1px solid ' + (sent ? '#bde5cb' : 'var(--gold-200)'),
    }}>
      <p className="eyebrow" style={{ margin: 0 }}>Venue notice</p>
      <p className="small" style={{ margin: '6px 0 0', color: 'var(--ink)' }}>
        {sent
          ? venueName + ' was emailed about this meetup' + (toEmail ? ' at ' + toEmail : '') + '.'
          : !hasContact
            ? 'We have no contact email for ' + venueName + ', so they have not been told. An admin can add one.'
            : status === 'skipped'
              ? venueName + ' is set not to receive notices.'
              : status
                ? 'The notice to ' + venueName + ' has not gone out yet.'
                : venueName + ' has not been told about this meetup yet.'}
      </p>
      {!sent && hasContact && status !== 'skipped' && (
        <button className="btn btn-out" disabled={pending}
          style={{ minHeight: 36, padding: '0 14px', fontSize: 13.5, marginTop: 10 }}
          onClick={() => start(async () => {
            const res: any = await notifyMyVenue(eventId);
            if (res?.error) { setIsError(true); setMsg(res.error); }
            else { setIsError(false); setMsg(res.ok); router.refresh(); }
          })}>
          {pending ? 'Sending…' : 'Let them know'}
        </button>
      )}
      {msg && <p className={isError ? 'err' : 'hint'} style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}
