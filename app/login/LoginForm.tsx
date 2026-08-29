'use client';
import { useActionState } from 'react';
import { signIn, type ActionState } from '@/app/actions/auth';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(signIn, {});
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
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Log in'}
      </button>
    </form>
  );
}
