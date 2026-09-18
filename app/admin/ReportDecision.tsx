'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resolveMessageReport } from '@/app/actions/admin';

/**
 * Closing a report is a decision, so it asks for one: dismiss it, or uphold it
 * and warn the member. Upholding opens a note field — the admin's own words
 * reach the member ahead of the boilerplate, which is what makes a warning
 * land. The reporter is never named.
 */
export function ReportDecision({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<null | 'uphold' | 'dismiss'>(null);
  const [note, setNote] = useState('');
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const send = (uphold: boolean) => start(async () => {
    const res: any = await resolveMessageReport(reportId, uphold, uphold ? note : '');
    if (res?.error) { setIsError(true); setMsg(res.error); }
    else { setIsError(false); setMsg(res.ok); setMode(null); router.refresh(); }
  });

  if (msg && !mode) {
    return (
      <span className={isError ? 'err' : 'small'}
        style={{ color: isError ? undefined : 'var(--ok)' }}>{msg}</span>
    );
  }

  if (!mode) {
    return (
      <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
        <button className="btn btn-out" disabled={pending}
          style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
          onClick={() => setMode('uphold')}>Warn member</button>
        <button className="btn btn-quiet" disabled={pending}
          style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
          onClick={() => setMode('dismiss')}>Dismiss</button>
      </div>
    );
  }

  if (mode === 'dismiss') {
    return (
      <div style={{ textAlign: 'left' }}>
        <p className="small" style={{ margin: '0 0 10px' }}>
          Close this without warning anyone?
        </p>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-primary" disabled={pending}
            style={{ minHeight: 34, padding: '0 14px', fontSize: 13.5 }}
            onClick={() => send(false)}>
            {pending ? 'Closing…' : 'Yes, dismiss'}
          </button>
          <button className="btn btn-quiet" disabled={pending}
            style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
            onClick={() => setMode(null)}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      textAlign: 'left', padding: 14, borderRadius: 12, minWidth: 260,
      border: '1px solid var(--gold-200)', background: 'var(--gold-100)',
    }}>
      <p style={{
        fontSize: 12.5, fontWeight: 600, letterSpacing: '.09em',
        textTransform: 'uppercase', color: 'var(--gold-700)', margin: '0 0 8px',
      }}>Warning</p>

      <label className="fld" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 15 }}>What should they know?</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)}
          rows={3} maxLength={600}
          placeholder="Sales pitches to members you have not met are not what messaging is for." />
        <span className="hint">
          Sent to them ahead of the standard wording. The person who reported it is never named.
        </span>
      </label>

      {msg && isError && <p className="err">{msg}</p>}

      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-primary" disabled={pending}
          style={{ minHeight: 34, padding: '0 14px', fontSize: 13.5 }}
          onClick={() => send(true)}>
          {pending ? 'Sending…' : 'Uphold and warn'}
        </button>
        <button className="btn btn-quiet" disabled={pending}
          style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
          onClick={() => { setMode(null); setMsg(null); }}>Back</button>
      </div>
    </div>
  );
}
