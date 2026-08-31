'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { rescheduleEvent, postponeEvent, cancelEvent, restoreEvent } from '@/app/actions/eventLifecycle';

type Mode = null | 'reschedule' | 'postpone' | 'cancel' | 'restore';

/** Postpone, move or call off an event — attendees are notified automatically. */
export function EventLifecycle({
  eventId, title, status, startsAt, seatCount,
}: {
  eventId: string; title: string; status: string; startsAt: string; seatCount: number;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const live = status === 'published' || status === 'pending';

  const run = (fn: (fd: FormData) => Promise<any>, fd: FormData) => start(async () => {
    const res = await fn(fd);
    if (res?.error) { setIsError(true); setMsg(res.error); }
    else { setIsError(false); setMsg(res?.ok ?? 'Done.'); setMode(null); router.refresh(); }
  });

  const label = {
    reschedule: 'Move to a new date',
    postpone: 'Postpone this event',
    cancel: 'Cancel this event',
    restore: 'Put it back on the calendar',
  } as const;

  return (
    <div>
      <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
        {live && (
          <>
            <button className="btn btn-out" disabled={pending}
              style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
              onClick={() => setMode(mode === 'reschedule' ? null : 'reschedule')}>Move</button>
            <button className="btn btn-out" disabled={pending}
              style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
              onClick={() => setMode(mode === 'postpone' ? null : 'postpone')}>Postpone</button>
          </>
        )}
        {(status === 'postponed' || status === 'cancelled') && (
          <button className="btn btn-gold" disabled={pending}
            style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
            onClick={() => setMode(mode === 'restore' ? null : 'restore')}>Reinstate</button>
        )}
        {status !== 'cancelled' && (
          <button className="btn btn-quiet" disabled={pending}
            style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5, color: 'var(--err)' }}
            onClick={() => setMode(mode === 'cancel' ? null : 'cancel')}>Cancel</button>
        )}
      </div>

      {mode && (
        <form
          style={{
            marginTop: 12, padding: 18, borderRadius: 14, textAlign: 'left',
            border: '1px solid ' + (mode === 'cancel' ? 'rgba(180,35,24,.3)' : 'var(--gold-200)'),
            background: mode === 'cancel' ? '#fff6f5' : 'var(--gold-100)',
          }}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set('event_id', eventId);
            if (mode === 'reschedule') run(rescheduleEvent, fd);
            if (mode === 'postpone') run(postponeEvent, fd);
            if (mode === 'restore') run(restoreEvent, fd);
            if (mode === 'cancel') {
              if (!confirm('Cancel "' + title + '"? ' + seatCount + ' seat holder(s) will be told and their seats released.')) return;
              run(cancelEvent, fd);
            }
          }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>{label[mode]}</p>

          {(mode === 'reschedule' || mode === 'restore') && (
            <label className="fld" style={{ marginBottom: 12 }}>
              <span>New date and time</span>
              <input name="starts_at" type="datetime-local" required
                defaultValue={new Date(startsAt).toISOString().slice(0, 16)} />
            </label>
          )}

          {mode !== 'restore' && (
            <label className="fld" style={{ marginBottom: 12 }}>
              <span>{mode === 'cancel' ? 'Reason (shared with attendees)' : 'Note (optional)'}</span>
              <input name="note" maxLength={500}
                placeholder={
                  mode === 'cancel' ? 'Venue fell through'
                    : mode === 'postpone' ? 'New date to be confirmed'
                      : 'Speaker asked to move it a week'
                } />
            </label>
          )}

          <p className="mute small" style={{ margin: '0 0 14px' }}>
            {seatCount} seat holder(s) will be notified
            {mode === 'cancel' ? ' and their seats released.' : '. Seats carry over.'}
          </p>

          <div className="row" style={{ gap: 8 }}>
            <button className={mode === 'cancel' ? 'btn' : 'btn btn-primary'} type="submit" disabled={pending}
              style={mode === 'cancel'
                ? { background: 'var(--err)', color: '#fff', minHeight: 40, padding: '0 18px', fontSize: 14 }
                : { minHeight: 40, padding: '0 18px', fontSize: 14 }}>
              {pending ? 'Working…' : mode === 'cancel' ? 'Cancel the event' : 'Confirm'}
            </button>
            <button className="btn btn-quiet" type="button" onClick={() => setMode(null)}
              style={{ minHeight: 40, padding: '0 14px', fontSize: 14 }}>Never mind</button>
          </div>
        </form>
      )}

      {msg && (
        <p className={isError ? 'err' : 'hint'} style={{ textAlign: 'right', color: isError ? undefined : 'var(--ok)' }}>
          {msg}
        </p>
      )}
    </div>
  );
}
