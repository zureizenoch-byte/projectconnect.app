import { getSession } from '@/lib/auth';
import { ForgotForm } from './ForgotForm';

export const metadata = { title: 'Reset your password — Project Connect' };
export const dynamic = 'force-dynamic';

export default async function ForgotPage() {
  // The page is public, so a member who never signed out still sees the member
  // header here. Say so plainly rather than leaving them to wonder.
  const session = await getSession();

  return (
    <main className="wrap" style={{ maxWidth: 480 }}>
      <h1>Reset your password</h1>
      <p className="mute" style={{ marginTop: 10 }}>
        Give us the email you signed up with and we'll send a link to set a new password.
      </p>

      {session && (
        <div className="surf" style={{
          padding: 18, marginTop: 20,
          background: 'var(--gold-100)', borderColor: 'var(--gold-200)',
        }}>
          <strong style={{ color: 'var(--gold-700)' }}>
            You're signed in as {session.profile.full_name ?? session.profile.email}
          </strong>
          <p className="mute small" style={{ margin: '6px 0 12px' }}>
            You don't need a reset link — change your password directly from your profile.
            Use the form below only if you're resetting a different account.
          </p>
          <a className="btn btn-gold" href="/profile#password"
            style={{ minHeight: 40, padding: '0 16px', fontSize: 14 }}>
            Change my password
          </a>
        </div>
      )}

      <div className="surf" style={{ padding: 28, marginTop: 24 }}>
        <ForgotForm />
      </div>

      <p className="small mute" style={{ marginTop: 16 }}>
        Remembered it? <a href="/login">Back to log in</a>
      </p>
    </main>
  );
}
