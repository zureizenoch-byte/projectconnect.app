import { LoginForm } from './LoginForm';

export const metadata = { title: 'Log in — Project Connect' };

export default function LoginPage({ searchParams }: {
  searchParams: { next?: string; error?: string; notice?: string; confirmed?: string };
}) {
  const confirmed = searchParams.confirmed === '1';
  const notice = searchParams.notice;

  // A confirmation link opened on another device is not an error worth
  // alarming anyone with — it nearly always means the address is already done.
  const noticeText = notice === 'already-confirmed'
    ? 'Your email may already be confirmed. Please log in.'
    : notice;

  return (
    <main className="wrap" style={{ maxWidth: 480 }}>
      <h1>Log in</h1>

      {confirmed && (
        <div className="surf" style={{
          padding: 16, marginTop: 18, borderColor: '#bde5cb', background: '#e8f6ed',
        }}>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--ok)' }}>
            Your email is confirmed. Please log in.
          </p>
        </div>
      )}

      {!confirmed && noticeText && (
        <div className="surf" style={{
          padding: 16, marginTop: 18, borderColor: 'var(--gold-200)', background: 'var(--gold-100)',
        }}>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--gold-700)' }}>{noticeText}</p>
        </div>
      )}

      {searchParams.error && (
        <div className="surf" style={{
          padding: 16, marginTop: 18, borderColor: 'rgba(180,35,24,.3)', background: '#fff5f4',
        }}>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--err)' }}>
            {searchParams.error === 'expired'
              ? 'That confirmation link has expired or was already used. Log in below, or sign up again.'
              : /verifier|pkce|code challenge/i.test(searchParams.error)
                ? 'Your email may already be confirmed. Please log in.'
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
