'use client';
import { useState, useTransition } from 'react';
import { claimAdmin } from '@/app/actions/admin';

export function ClaimAdmin() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div>
      <button className="btn btn-primary" disabled={pending}
        onClick={() => start(async () => {
          const res = await claimAdmin();
          setMsg(res?.error ?? 'Done — sign out and back in, then open Admin.');
        })}>
        {pending ? 'Claiming…' : 'Make me an admin'}
      </button>
      {msg && <p className="hint" style={{ color: msg.startsWith('Done') ? 'var(--ok)' : 'var(--err)' }}>{msg}</p>}
    </div>
  );
}
