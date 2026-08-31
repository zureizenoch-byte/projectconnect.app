import { LoginForm } from './LoginForm';

export const metadata = { title: 'Log in — Project Connect' };

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return (
    <main className="wrap" style={{ maxWidth: 480 }}>
      <h1>Log in</h1>
      {searchParams.error && (
        <div className="surf" style={{
          padding: 16, marginTop: 18, borderColor: 'rgba(180,35,24,.3)', background: '#fff5f4',
        }}>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--err)' }}>
            {searchParams.error === 'expired'
              ? 'That confirmation link has expired or was already used. Log in below, or sign up again.'
              : searchParams.error}
          </p>
        </div>
      )}
      <div className="surf" style={{ padding: 28, marginTop: 24 }}>
        <LoginForm next={searchParams.next ?? '/dashboard'} />
      </div>
      <p className="small mute" style={{ marginTop: 16 }}>
        New here? <a href="/signup">Create an account</a>
      </p>
    </main>
  );
}
