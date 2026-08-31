'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setVenueActive, deleteVenue } from '@/app/actions/admin';

export function VenueRow({ venue }: { venue: any }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const say = (text: string, bad: boolean) => { setMsg(text); setIsError(bad); };

  const remove = (force: boolean) => start(async () => {
    const res: any = await deleteVenue(venue.id, force);
    if (res?.ok) { say('Deleted.', false); router.refresh(); return; }

    if (res?.usedBy) {
      const ok = confirm(
        res.error + '\n\nDelete anyway? Those events will show "to be confirmed" instead. ' +
        'Choose Cancel to retire the venue and keep their history.');
      if (ok) remove(true);
      else say('Kept. Use Retire to hide it from new events.', false);
      return;
    }
    say(res?.error ?? 'Could not delete.', true);
  });

  return (
    <tr style={{ opacity: venue.active ? 1 : .6 }}>
      <td>
        {venue.name}
        {msg && (
          <>
            <br />
            <span className="small" style={{ color: isError ? 'var(--err)' : 'var(--ok)' }}>{msg}</span>
          </>
        )}
      </td>
      <td className="mute small">{venue.address}</td>
      <td className="mute">{venue.capacity}</td>
      <td>
        {venue.active
          ? <span className="pill pill-ok">Active</span>
          : <span className="pill pill-off">Retired</span>}
      </td>
      <td>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
          <button className="btn btn-out" disabled={pending}
            style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
            onClick={() => start(async () => {
              const res: any = await setVenueActive(venue.id, !venue.active);
              if (res?.error) say(res.error, true);
              else router.refresh();
            })}>
            {venue.active ? 'Retire' : 'Restore'}
          </button>
          <button className="btn btn-quiet" disabled={pending}
            style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5, color: 'var(--err)' }}
            onClick={() => {
              if (!confirm('Permanently delete ' + venue.name + '?')) return;
              remove(false);
            }}>
            {pending ? 'Working…' : 'Delete'}
          </button>
        </div>
      </td>
    </tr>
  );
}
