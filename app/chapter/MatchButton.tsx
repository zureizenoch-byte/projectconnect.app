'use client';
import { useState, useTransition } from 'react';
import { autoMatch } from '@/app/actions/events';

export function MatchButton({ eventId }: { eventId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <button className="btn btn-out" disabled={pending}
        onClick={() => start(async () => {
          const res = await autoMatch(eventId);
          setMsg(res?.error ?? 'Assigned ' + res.tables + ' table(s).');
        })}>
        {pending ? 'Matching…' : 'Auto-match tables'}
      </button>
      {msg && <p className="hint">{msg}</p>}
    </div>
  );
}
