'use client';

import { useActionState } from 'react';
import { useState } from 'react';
import { signUp, type ActionState } from '@/app/actions/auth';
import { CITIES } from '@/lib/options';

const JOIN_AS: [string, string, string][] = [
  ['member', 'Member', 'Matched meetups and Speaker Series talks in your chapter.'],
  ['student', 'Student', 'Same rooms, with student-specific profile fields.'],
  ['speaker', 'Speaker', 'Host Speaker Series talks. An admin approves speaker accounts.'],
];

export function SignupForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(signUp, {});
  const [role, setRole] = useState('member');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const mismatch = pw2.length > 0 && pw !== pw2;

  return (
    <form action={action}>
      <fieldset style={{ border: 0, padding: 0, margin: '0 0 26px' }}>
        <legend style={{ fontSize: 17.5, fontWeight: 600, marginBottom: 10 }}>I'm joining as</legend>
        <div className="grid g3">
          {JOIN_AS.map(([value, label, note]) => (
            <label key={value} className="surf"
              style={{
                padding: 16, cursor: 'pointer', boxShadow: 'none',
                borderColor: role === value ? 'var(--blue-700)' : 'var(--line)',
                background: role === value ? 'var(--blue-100)' : '#fff',
              }}>
              <input type="radio" name="role" value={value} checked={role === value}
                onChange={() => setRole(value)} style={{ marginRight: 8 }} />
              <strong>{label}</strong>
              <p className="small mute" style={{ margin: '6px 0 0' }}>{note}</p>
            </label>
          ))}
        </div>
      </fieldset>

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
        <input name="password" type="password" required minLength={10} autoComplete="new-password"
          value={pw} onChange={(e) => setPw(e.target.value)} />
        <span className="hint">At least 10 characters.</span>
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

      <button className="btn btn-primary" type="submit" disabled={pending || mismatch}>
        {pending ? 'Creating your account…' : 'Create account'}
      </button>
    </form>
  );
}
