'use client';
import { useState, useTransition } from 'react';
import { setSeatStatus, setTable } from '@/app/actions/events';

export function SeatActions({ seatId, showTable = false, tableNo = null }:
  { seatId: string; showTable?: boolean; tableNo?: number | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const act = (status: 'confirmed' | 'waitlist' | 'cancelled') =>
    start(async () => {
      const res = await setSeatStatus(seatId, status);
      setError(res?.error ?? null);
    });

  return (
    <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
      {showTable && (
        <input aria-label="Table number" type="number" min={1} max={20} defaultValue={tableNo ?? ''}
          style={{ width: 64, minHeight: 34, padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 8 }}
          onBlur={(e) => start(async () => {
            const v = e.target.value === '' ? null : Number(e.target.value);
            const res = await setTable(seatId, v);
            setError(res?.error ?? null);
          })} />
      )}
      <button className="btn btn-gold" style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
        disabled={pending} onClick={() => act('confirmed')}>Confirm</button>
      <button className="btn btn-out" style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
        disabled={pending} onClick={() => act('waitlist')}>Waitlist</button>
      {error && <span className="err">{error}</span>}
    </div>
  );
}
