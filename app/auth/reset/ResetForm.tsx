'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const RULE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/;

export function ResetForm() {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const valid = RULE.test(pw);
  const mismatch = confirm.length > 0 && pw !== confirm;

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
