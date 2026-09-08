import { ForgotForm } from './ForgotForm';

export const metadata = { title: 'Reset your password — Project Connect' };

export default function ForgotPage() {
  return (
    <main className="wrap" style={{ maxWidth: 480 }}>
      <h1>Reset your password</h1>
      <p className="mute" style={{ marginTop: 10 }}>
        Give us the email you signed up with and we'll send a link to set a new password.
      </p>
      <div className="surf" style={{ padding: 28, marginTop: 24 }}>
        <ForgotForm />
      </div>
      <p className="small mute" style={{ marginTop: 16 }}>
        Remembered it? <a href="/login">Back to log in</a>
      </p>
    </main>
  );
}
