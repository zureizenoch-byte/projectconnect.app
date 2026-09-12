'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const RULE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/;

export function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ready, setReady] = useState<'checking' | 'ok' | 'expired'>('checking');

  // The link may arrive as a ?code, as a #access_token fragment, or with the
  // session already established by the callback. Handle all three.
  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const code = params.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        setReady(error ? 'expired' : 'ok');
        return;
      }

      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        setReady(error ? 'expired' : 'ok');
        return;
      }

      const { data } = await supabase.auth.getUser();
      setReady(data.user ? 'ok' : 'expired');
    })();
  }, [params]);

  const valid = RULE.test(pw);
  const mismatch = confirm.length > 0 && pw !== confirm;

  if (ready === 'checking') {
    return <p className="mute">Checking your link…</p>;
  }

  if (ready === 'expired') {
    return (
      <div>
        <p style={{ marginTop: 0 }}>
          This link has expired or has already been used. Reset links are good for one hour.
        </p>
        <a className="btn btn-primary" href="/login/forgot" style={{ marginTop: 12 }}>
          Send a new link
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      setMsg(null);
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pw });
      setBusy(false);
      if (error) setMsg(error.message);
      else router.push('/dashboard');
    }}>
      <label className="fld"><span>New password</span>
        <input type="password" required minLength={8} maxLength={20} autoComplete="new-password"
          value={pw} onChange={(e) => setPw(e.target.value)} />
        {pw.length > 0 && (
          <span className="hint" style={{ color: valid ? 'var(--ok)' : 'var(--mute)' }}>
            {valid ? 'Meets the requirements' : '8 to 20 characters, letters and numbers'}
          </span>
        )}
      </label>
      <label className="fld"><span>Retype new password</span>
        <input type="password" required maxLength={20} autoComplete="new-password"
          value={confirm} onChange={(e) => setConfirm(e.target.value)}
          style={mismatch ? { borderColor: 'var(--err)' } : undefined} />
        {mismatch && <span className="err">Passwords do not match</span>}
      </label>
      {msg && <p className="err">{msg}</p>}
      <button className="btn btn-primary" type="submit" disabled={busy || !valid || mismatch}
        style={{ minHeight: 50, padding: '0 26px', fontSize: 16 }}>
        {busy ? 'Saving…' : 'Set new password'}
      </button>
    </form>
  );
}
