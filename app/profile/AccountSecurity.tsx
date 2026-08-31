'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { changePassword, deleteAccount, type AccountState } from '@/app/actions/account';

export function AccountSecurity({ email }: { email: string }) {
  return (
    <>
      <ChangePassword />
      <DeleteAccount email={email} />
    </>
  );
}

function ChangePassword() {
  const [state, action] = useFormState<AccountState, FormData>(changePassword, {});
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = confirm.length > 0 && next !== confirm;
  const valid = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8}$/.test(next);

  return (
    <form action={action} className="surf" style={{ padding: 'clamp(22px,3vw,34px)', marginTop: 22 }}>
      <h2 style={{ fontSize: 24 }}>Change password</h2>
      <p className="mute small" style={{ marginTop: 6 }}>
        Exactly 8 characters, letters and numbers only, with at least one of each.
      </p>

      <div style={{ maxWidth: 420, marginTop: 20 }}>
        <label className="fld">
          <span>Current password</span>
          <input name="current_password" type="password" required autoComplete="current-password" />
        </label>
        <label className="fld">
          <span>New password</span>
          <input name="new_password" type="password" required maxLength={8} autoComplete="new-password"
            value={next} onChange={(e) => setNext(e.target.value)} />
          {next.length > 0 && (
            <span className="hint" style={{ color: valid ? 'var(--ok)' : 'var(--mute)' }}>
              {valid ? 'Meets the requirements' : '8 characters, letters and numbers'}
            </span>
          )}
        </label>
        <label className="fld">
          <span>Retype new password</span>
          <input name="confirm_password" type="password" required maxLength={8} autoComplete="new-password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)}
            style={mismatch ? { borderColor: 'var(--err)' } : undefined} />
          {mismatch && <span className="err">Passwords do not match</span>}
        </label>
      </div>

      {state.error && <p className="err">{state.error}</p>}
      {state.ok && <p className="hint" style={{ color: 'var(--ok)' }}>{state.ok}</p>}
      <Submit label="Change password" busy="Changing…" disabled={mismatch || !valid} />
    </form>
  );
}

function DeleteAccount({ email }: { email: string }) {
  const [state, action] = useFormState<AccountState, FormData>(deleteAccount, {});
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');

  return (
    <div className="surf" style={{
      padding: 'clamp(22px,3vw,34px)', marginTop: 22,
      borderColor: 'rgba(180,35,24,.28)',
    }}>
      <h2 style={{ fontSize: 24, color: 'var(--err)' }}>Delete account</h2>
      <p className="mute small" style={{ marginTop: 6, maxWidth: '60ch' }}>
        Permanently removes <strong>{email}</strong>, your profile, experience mapping, RSVPs and
        posts. Seats you hold are released for other members. This cannot be undone.
      </p>

      {!open ? (
        <button type="button" className="btn btn-out" onClick={() => setOpen(true)}
          style={{ marginTop: 16, borderColor: 'rgba(180,35,24,.4)', color: 'var(--err)' }}>
          Delete my account
        </button>
      ) : (
        <form action={action} style={{ maxWidth: 420, marginTop: 18 }}>
          <label className="fld">
            <span>Your password</span>
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          <label className="fld">
            <span>Type DELETE to confirm</span>
            <input name="confirm_text" required value={typed}
              onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" />
          </label>
          {state.error && <p className="err">{state.error}</p>}
          <div className="row" style={{ gap: 10 }}>
            <DangerSubmit disabled={typed.trim() !== 'DELETE'} />
            <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

function Submit({ label, busy, disabled }: { label: string; busy: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending || disabled}>
      {pending ? busy : label}
    </button>
  );
}

function DangerSubmit({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending || disabled}
      style={{ background: 'var(--err)', color: '#fff' }}>
      {pending ? 'Deleting…' : 'Permanently delete'}
    </button>
  );
}
