import { CURRENT_TERMS_VERSION } from '@/lib/legal';

export const metadata = { title: 'Terms of Service — Project Connect' };

export default function TermsPage() {
  return (
    <main className="wrap" style={{ maxWidth: 820 }}>
      <h1>Terms of Service</h1>
      <p className="mute" style={{ marginTop: 10 }}>Version {CURRENT_TERMS_VERSION}</p>
      <div className="surf" style={{ padding: 28, marginTop: 22 }}>
        <p>
          Paste the approved Terms of Service text here. Consent is recorded at signup against the
          version constant in <code>lib/legal.ts</code>.
        </p>
      </div>
    </main>
  );
}
