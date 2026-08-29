'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { signIn, type ActionState } from '@/app/actions/auth';

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useFormState<ActionState, FormData>(signIn, {});
  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      <label className="fld"><span>Email</span>
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label className="fld"><span>Password</span>
        <input name="password" type="password" required autoComplete="current-password" />
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
      {pending ? 'Signing in…' : 'Log in'}
    </button>
  );
}
