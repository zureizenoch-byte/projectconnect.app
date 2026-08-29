import { LoginForm } from './LoginForm';

export const metadata = { title: 'Log in — Project Connect' };

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <main className="wrap" style={{ maxWidth: 480 }}>
      <h1>Log in</h1>
      <div className="surf" style={{ padding: 28, marginTop: 24 }}>
        <LoginForm next={searchParams.next ?? '/dashboard'} />
      </div>
      <p className="small mute" style={{ marginTop: 16 }}>
        New here? <a href="/signup">Create an account</a>
      </p>
    </main>
  );
}
