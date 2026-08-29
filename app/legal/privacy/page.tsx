import { CURRENT_PRIVACY_VERSION } from '@/lib/legal';

export const metadata = { title: 'Privacy Policy — Project Connect' };

export default function PrivacyPage() {
  return (
    <main className="wrap" style={{ maxWidth: 820 }}>
      <h1>Privacy Policy</h1>
      <p className="mute" style={{ marginTop: 10 }}>Version {CURRENT_PRIVACY_VERSION}</p>
      <div className="surf" style={{ padding: 28, marginTop: 22 }}>
        <p>
          Paste the approved Privacy Policy text here, or render it from a CMS. The signup flow
          records a consent row per member against the version constant in <code>lib/legal.ts</code> —
          bump that constant whenever the text changes materially so consent records stay meaningful.
        </p>
      </div>
    </main>
  );
}
