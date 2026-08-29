'use client';
import { useState, useTransition } from 'react';
import { rsvp } from '@/app/actions/events';
import { mapsUrl } from '@/lib/matching';

export function RsvpButton({
  eventId, address, status, full,
}: { eventId: string; address: string | null; status: string | null; full: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(status);

  const label = current && current !== 'cancelled'
    ? (current === 'confirmed' ? 'Going — cancel seat' : current === 'waitlist' ? 'On the waitlist' : 'Requested — cancel')
    : full ? 'Join the waitlist' : 'RSVP';

  return (
    <div>
      <div className="row">
        <button className="btn btn-gold" disabled={pending}
          onClick={() => start(async () => {
            setError(null);
            const res = await rsvp(eventId);
            if (res?.error) setError(res.error);
            else setCurrent(current && current !== 'cancelled' ? 'cancelled' : 'requested');
          })}>
          {pending ? 'Saving…' : label}
        </button>
        {address && (
          <a className="btn btn-out" href={mapsUrl(address)} target="_blank" rel="noopener noreferrer">
            Directions
          </a>
        )}
      </div>
      {error && <p className="err">{error}</p>}
    </div>
  );
}
