'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { rsvp } from '@/app/actions/events';
import { mapsUrl } from '@/lib/matching';

export function RsvpButton({
  eventId, address, status, full,
}: { eventId: string; address: string | null; status: string | null; full: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(status);

  const label = current && current !== 'cancelled'
    ? (current === 'confirmed' ? "You're going — cancel"
      : current === 'waitlist' ? 'On the waitlist — leave'
        : 'Cancel')
    : full ? 'Join the waitlist' : 'Take a seat';

  return (
    <div>
      <div className="row">
        <button className="btn btn-gold" disabled={pending}
          onClick={() => start(async () => {
            setError(null);
            const res = await rsvp(eventId);
            if (res?.error) setError(res.error);
            else {
              setCurrent(current && current !== 'cancelled' ? 'cancelled' : (full ? 'waitlist' : 'confirmed'));
              router.refresh();
            }
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
