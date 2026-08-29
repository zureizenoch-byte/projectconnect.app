import type { Metadata } from 'next';
import './globals.css';
import { SiteNav } from '@/components/SiteNav';
import { getSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Project Connect',
  description: 'Matched small-group meetups for PM, Product, Agile, QA, Data, Cyber, Cloud and Delivery professionals.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://projectconnect.app'),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en">
      <body>
        <SiteNav profile={session?.profile ?? null} />
        {children}
        <footer style={{ borderTop: '1px solid var(--line)', background: '#fff', marginTop: 48 }}>
          <div className="wrap grid g3" style={{ paddingBlock: 40 }}>
            <div>
              <span className="brand" style={{ display: 'inline-flex' }}>
                <img src="/pc-mark-2026.png" alt="" />
                <span>Project<span style={{ color: 'var(--gold-700)' }}>Connect</span></span>
              </span>
              <p className="mute small" style={{ marginTop: 10, maxWidth: '32ch' }}>
                Matched small-group meetups by city chapter.
              </p>
            </div>
            <div>
              <p className="eyebrow">Product</p>
              <p className="small"><a href="/dashboard">Dashboard</a></p>
              <p className="small"><a href="/events">Events</a></p>
              <p className="small"><a href="/venues">Venues</a></p>
            </div>
            <div>
              <p className="eyebrow">Account</p>
              <p className="small"><a href="/pricing">Pricing</a></p>
              <p className="small"><a href="/profile">Profile</a></p>
              <p className="small"><a href="/billing">Billing</a></p>
            </div>
            <div>
              <p className="eyebrow">Legal</p>
              <p className="small"><a href="/legal/privacy">Privacy Policy</a></p>
              <p className="small"><a href="/legal/terms">Terms of Service</a></p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
