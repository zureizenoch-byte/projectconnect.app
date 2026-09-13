'use client';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { signIn, type ActionState } from '@/app/actions/auth';

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useFormState<ActionState, FormData>(signIn, {});
  const [show, setShow] = useState(false);

  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />

      <label className="fld"><span>Email</span>
        <input name="email" type="email" required autoComplete="email" />
      </label>

      <label className="fld" style={{ marginBottom: 10 }}>
        <span>Password</span>
        <span style={{ position: 'relative', display: 'block' }}>
          <input name="password" required autoComplete="current-password"
            type={show ? 'text' : 'password'}
            style={{ paddingRight: 78 }} />
          <button type="button" onClick={() => setShow((s) => !s)}
            aria-pressed={show}
            aria-label={show ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)',
              minHeight: 32, padding: '0 10px', borderRadius: 8, cursor: 'pointer',
              border: '1px solid var(--line)', background: '#fff',
              font: 'inherit', fontSize: 13.5, color: 'var(--mute)',
            }}>
            {show ? 'Hide' : 'Show'}
          </button>
        </span>
      </label>

      <p className="small" style={{ margin: '0 0 20px' }}>
        <a href="/login/forgot">Forgot your password?</a>
      </p>

      {state.error && <p className="err">{state.error}</p>}
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}
      style={{ minHeight: 50, padding: '0 26px', fontSize: 16 }}>
      {pending ? 'Signing in…' : 'Log in'}
    </button>
  );
}
