'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { signUp, resendConfirmation, type ActionState } from '@/app/actions/auth';
import { CITIES } from '@/lib/options';

const JOIN_AS: [string, string, string][] = [
  ['member', 'Member', 'Matched meetups and Speaker Series talks in your chapter.'],
  ['student', 'Student', 'Same rooms, with student-specific profile fields.'],
  ['speaker', 'Speaker', 'Host Speaker Series talks. An admin approves speaker accounts.'],
  ['chapter_lead', 'Chapter Lead', 'Run your city\u2019s calendar and seating. Needs a paid plan and admin approval.'],
];

export function SignupForm() {
  const [state, action] = useFormState<ActionState, FormData>(signUp, {});
  const [role, setRole] = useState('member');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const mismatch = pw2.length > 0 && pw !== pw2;
  const pwOk = pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);

  if (state.checkEmail) return <CheckEmail email={state.checkEmail} />;

  return (
    <form action={action}>
      <fieldset style={{ border: 0, padding: 0, margin: '0 0 26px' }}>
        <legend style={{ fontSize: 17.5, fontWeight: 600, marginBottom: 10 }}>I'm joining as</legend>
        <div className="grid g3">
          {JOIN_AS.map(([value, label, note]) => (
            <label key={value} className="surf"
              style={{
                padding: 16, cursor: 'pointer', boxShadow: 'none',
                borderColor: role === value ? 'var(--gold-700)' : 'var(--line)',
                background: role === value ? 'var(--gold-100)' : '#fff',
              }}>
              <input type="radio" name="role" value={value} checked={role === value}
                onChange={() => setRole(value)} style={{ marginRight: 8 }} />
              <strong>{label}</strong>
              <p className="small mute" style={{ margin: '6px 0 0' }}>{note}</p>
            </label>
          ))}
        </div>
      </fieldset>

      {role === 'chapter_lead' && (
        <div style={{
          padding: '16px 18px', marginBottom: 24, borderRadius: 14,
          background: 'var(--gold-100)', border: '1px solid var(--gold-200)',
        }}>
          <p className="eyebrow" style={{ margin: 0 }}>Your application</p>
          <p className="mute small" style={{ margin: '6px 0 12px' }}>
            You\u2019ll join as a member straight away. An admin reads this and grants Chapter
            Lead access, which needs a paid plan — that keeps leads invested in their own chapter.
          </p>
          <label className="fld" style={{ marginBottom: 0 }}>
            <span>Why you, and what you\u2019d run</span>
            <textarea name="lead_note" rows={5} required
              placeholder="The city you'd lead, your experience convening people, and how often you'd run rooms." />
          </label>
        </div>
      )}

      <label className="fld"><span>Pronouns</span>
        <input name="pronouns" placeholder="she/her, he/him, they/them" />
      </label>

      <label className="fld"><span>Full name</span>
        <input name="full_name" required autoComplete="name" />
        {state.fieldErrors?.full_name && <span className="err">{state.fieldErrors.full_name}</span>}
      </label>

      <label className="fld"><span>Email</span>
        <input name="email" type="email" required autoComplete="email" />
        {state.fieldErrors?.email && <span className="err">{state.fieldErrors.email}</span>}
      </label>

      <label className="fld"><span>Password</span>
        <input name="password" type="password" required minLength={8} maxLength={20} autoComplete="new-password"
          value={pw} onChange={(e) => setPw(e.target.value)} />
        <span className="hint" style={pwOk || pw.length === 0 ? undefined : { color: 'var(--err)' }}>
          At least 8 characters, using both letters and numbers.
        </span>
        {state.fieldErrors?.password && <span className="err">{state.fieldErrors.password}</span>}
      </label>

      <label className="fld"><span>Retype password</span>
        <input name="confirm" type="password" required autoComplete="new-password"
          value={pw2} onChange={(e) => setPw2(e.target.value)}
          style={mismatch ? { borderColor: 'var(--err)' } : undefined} />
        {mismatch
          ? <span className="err">Passwords do not match</span>
          : pw2.length > 0 && <span className="hint" style={{ color: 'var(--ok)' }}>Passwords match</span>}
      </label>

      <label className="fld"><span>City chapter</span>
        <select name="city" required defaultValue="Vancouver">
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>

      <label className="row" style={{ marginBottom: 22, alignItems: 'flex-start', gap: 10 }}>
        <input type="checkbox" name="is_immigrant" style={{ marginTop: 4 }} />
        <span>
          <strong>I'm an immigrant to Canada</strong>
          <span className="small mute" style={{ display: 'block' }}>
            Unlocks credential-recognition and work-authorisation fields on your profile. Never shown publicly.
          </span>
        </span>
      </label>

      <label className="row" style={{ marginBottom: 22, alignItems: 'flex-start', gap: 10 }}>
        <input type="checkbox" name="agree" required style={{ marginTop: 4 }} />
        <span>
          I have read and agree to the <a href="/legal/terms" target="_blank">Terms of Service</a> and{' '}
          <a href="/legal/privacy" target="_blank">Privacy Policy</a>.
        </span>
      </label>
      {state.fieldErrors?.agree && <p className="err">{state.fieldErrors.agree}</p>}
      {state.error && <p className="err">{state.error}</p>}

      <Submit label="Create account" busy="Creating your account…" disabled={mismatch || !pwOk} />
    </form>
  );
}

function Submit({ label, busy, disabled }: { label: string; busy: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending || disabled}
      style={{ minHeight: 50, padding: '0 26px', fontSize: 16 }}>
      {pending ? busy : label}
    </button>
  );
}

function CheckEmail({ email }: { email: string }) {
  const [resendState, resendAction] = useFormState<ActionState, FormData>(resendConfirmation, {});

  return (
    <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
      <span aria-hidden style={{
        display: 'grid', placeItems: 'center', width: 72, height: 72, margin: '0 auto',
        borderRadius: '50%', background: 'var(--gold-100)', border: '1px solid var(--gold-200)',
        fontSize: 30,
      }}>✉</span>

      <h2 style={{ fontSize: 30, marginTop: 20 }}>Check your email</h2>
      <p style={{ fontSize: 17, lineHeight: 1.65, margin: '14px auto 0', maxWidth: '44ch' }}>
        We sent a confirmation link to <strong>{email}</strong>. Open it to activate your
        account — you'll land straight on your profile to finish setting it up.
      </p>

      <div style={{
        margin: '24px auto 0', maxWidth: 420, padding: '16px 20px', textAlign: 'left',
        border: '1px solid var(--line)', borderRadius: 14, background: '#fcfcff',
      }}>
        <p className="mute" style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7 }}>
          Nothing after a couple of minutes? Check your spam folder — confirmation
          mail sometimes lands there the first time.
        </p>
      </div>

      <form action={resendAction} style={{ marginTop: 20 }}>
        <input type="hidden" name="email" value={email} />
        <ResendButton />
      </form>

      {resendState.error && <p className="err">{resendState.error}</p>}
      {resendState.ok && (
        <p className="hint" style={{ color: 'var(--ok)' }}>Sent again. Give it a minute.</p>
      )}

      <p className="hint" style={{ marginTop: 18 }}>
        Wrong address? <a href="/signup">Start again</a> · Already confirmed?{' '}
        <a href="/login">Log in</a>
      </p>
    </div>
  );
}

function ResendButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-out" type="submit" disabled={pending}>
      {pending ? 'Sending…' : 'Resend the email'}
    </button>
  );
}
