'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setSeatStatus, setTable, toggleCheckIn } from '@/app/actions/events';

/** The row a Chapter Lead works from at the door and beforehand. */
export function SeatRow({ seat, past }: { seat: any; past: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<any>) => start(async () => {
    const res = await fn();
    if (res?.error) setError(res.error);
    else { setError(null); router.refresh(); }
  });

  const person = seat.profiles ?? {};

  return (
    <tr>
      <td>
        <a href={'/members/' + seat.profile_id} style={{ fontWeight: 500, color: 'var(--ink)' }}>
          {person.full_name ?? 'Member'}
        </a>
        {error && <><br /><span className="err">{error}</span></>}
      </td>
      <td className="mute">{person.role_level ?? '—'}</td>
      <td>
        <span className={'pill ' + (
          seat.status === 'confirmed' ? 'pill-ok'
            : seat.status === 'waitlist' ? 'pill-off' : 'pill-wait')}>
          {seat.status}
        </span>
      </td>
      <td>
        <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
          <input aria-label="Table number" type="number" min={1} max={20}
            defaultValue={seat.table_no ?? ''}
            style={{
              width: 62, minHeight: 34, padding: '4px 8px',
              border: '1px solid var(--line)', borderRadius: 8, font: 'inherit', fontSize: 14,
            }}
            onBlur={(e) => {
              const v = e.target.value === '' ? null : Number(e.target.value);
              if (v === (seat.table_no ?? null)) return;
              run(() => setTable(seat.id, v));
            }} />

          {past ? (
            <button className={seat.checked_in ? 'btn btn-gold' : 'btn btn-out'} disabled={pending}
              style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
              onClick={() => run(() => toggleCheckIn(seat.id, !seat.checked_in))}>
              {seat.checked_in ? 'Attended' : 'Mark attended'}
            </button>
          ) : (
            <>
              <button className={seat.checked_in ? 'btn btn-gold' : 'btn btn-out'} disabled={pending}
                style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
                onClick={() => run(() => toggleCheckIn(seat.id, !seat.checked_in))}>
                {seat.checked_in ? 'Checked in' : 'Check in'}
              </button>
              {seat.status !== 'confirmed' && (
                <button className="btn btn-out" disabled={pending}
                  style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
                  onClick={() => run(() => setSeatStatus(seat.id, 'confirmed'))}>Give a seat</button>
              )}
              {seat.status === 'confirmed' && (
                <button className="btn btn-quiet" disabled={pending}
                  style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
                  onClick={() => run(() => setSeatStatus(seat.id, 'waitlist'))}>Waitlist</button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
