import { SignupForm } from './SignupForm';

export const metadata = { title: 'Join Project Connect' };

export default function SignupPage() {
  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      <p className="eyebrow">Create your account</p>
      <h1 style={{ marginTop: 12 }}>Join Project Connect</h1>
      <p className="mute" style={{ marginTop: 12 }}>
        Tell us how you're joining. You'll complete your profile next — it drives who you get matched with.
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
