'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { matchAttendees } from '@/app/actions/events';

/** Seat a meetup by mix of domains and role levels rather than by arrival order. */
export function MatchAttendeesButton({ eventId, requestCount, seatCap }:
  { eventId: string; requestCount: number; seatCap: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  return (
    <div>
      <button className="btn btn-out" disabled={pending || requestCount === 0}
        style={{ minHeight: 40, padding: '0 16px', fontSize: 14 }}
        onClick={() => {
          const over = requestCount > seatCap;
          if (over && !confirm(
            requestCount + ' people want ' + seatCap + ' seats. Seat the best mix and waitlist the rest?'
          )) return;
          start(async () => {
            const res: any = await matchAttendees(eventId);
            if (res?.error) { setIsError(true); setMsg(res.error); }
            else { setIsError(false); setMsg(res.ok); router.refresh(); }
          });
        }}>
        {pending ? 'Seating…' : 'Match attendees'}
      </button>
      {msg && (
        <p className={isError ? 'err' : 'hint'} style={!isError ? { color: 'var(--ok)' } : undefined}>
          {msg}
        </p>
      )}
    </div>
  );
}
