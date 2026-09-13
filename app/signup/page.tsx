import { SignupForm } from './SignupForm';

export const metadata = { title: 'Join Project Connect' };

export default function SignupPage() {
  return (
    <main className="wrap" style={{ maxWidth: 820 }}>
      <p className="eyebrow">Create your account</p>
      <h1 style={{ marginTop: 12 }}>Join Project Connect</h1>
      <p className="mute" style={{ marginTop: 12, maxWidth: '58ch', fontSize: 17 }}>
        Your input sharpens who you get matched with, and you can change it any time.
      </p>
      <div className="surf" style={{ padding: 'clamp(22px,3vw,34px)', marginTop: 26 }}>
        <SignupForm />
      </div>
      <p className="small mute" style={{ marginTop: 16 }}>
        Already a member? <a href="/login">Log in</a>
      </p>
    </main>
  );
}
