'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { requestPasswordReset, type ActionState } from '@/app/actions/auth';

export function ForgotForm() {
  const [state, action] = useFormState<ActionState, FormData>(requestPasswordReset, {});

  if (state.ok) {
    return (
      <div>
        <h2 style={{ fontSize: 22 }}>Check your email</h2>
        <p className="mute" style={{ marginTop: 10 }}>
          If that address has an account, a reset link is on its way. It expires in an hour.
        </p>
      </div>
    );
  }

  return (
    <form action={action}>
      <label className="fld"><span>Email</span>
        <input name="email" type="email" required autoComplete="email" />
      </label>
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
      {pending ? 'Sending…' : 'Send reset link'}
    </button>
  );
}
