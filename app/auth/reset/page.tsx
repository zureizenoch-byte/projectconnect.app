import { ResetForm } from './ResetForm';

export const metadata = { title: 'Choose a new password — Project Connect' };

export default function ResetPage() {
  return (
    <main className="wrap" style={{ maxWidth: 480 }}>
      <h1>Choose a new password</h1>
      <p className="mute" style={{ marginTop: 10 }}>
        Between 8 and 20 characters, letters and numbers, with at least one of each.
      </p>
      <div className="surf" style={{ padding: 28, marginTop: 24 }}>
        <ResetForm />
      </div>
    </main>
  );
}
