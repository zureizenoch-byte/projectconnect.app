import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteNav } from '@/components/SiteNav';
import { getSession } from '@/lib/auth';
import { getInboxCounts } from '@/lib/inbox';
import { getUnreadCount } from '@/lib/messages';
import { getUnreadNotificationCount } from '@/lib/notifications';

export const metadata: Metadata = {
  title: 'Project Connect',
  description: 'Matched small-group meetups for PM, Product, Agile, QA, Data, Cyber, Cloud and Delivery professionals.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://projectconnect.app'),
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    shortcut: ['/favicon.png'],
    apple: [{ url: '/favicon.png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#f8f8fd',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const [inbox, unread, alerts] = await Promise.all([
    session?.profile.role === 'admin' ? getInboxCounts() : Promise.resolve(null),
    session ? getUnreadCount(session.user.id) : Promise.resolve(0),
    session ? getUnreadNotificationCount(session.user.id) : Promise.resolve(0),
  ]);
  return (
    <html lang="en">
      <body>
        <SiteNav profile={session?.profile ?? null} inboxCount={inbox?.total ?? 0} unreadCount={unread} alertCount={alerts} />
        {children}
        <footer style={{ borderTop: '1px solid var(--line)', background: '#fff', marginTop: 40 }}>
          <div className="wrap" style={{
            paddingBlock: 32,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '22px 18px',
            alignItems: 'start',
          }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <span className="brand" style={{ display: 'inline-flex' }}>
                <img src="/pc-mark-2026.png" alt="" />
                <span>Project<span style={{ color: 'var(--gold-700)' }}>Connect</span></span>
              </span>
              <p className="mute small" style={{ margin: '8px 0 0', maxWidth: '32ch' }}>
                Matched small-group meetups by city chapter.
              </p>
            </div>
            <div>
              <p className="eyebrow" style={{ marginBottom: 6 }}>Product</p>
              <p className="small" style={{ margin: "0 0 3px" }}><a href="/dashboard">Dashboard</a></p>
              <p className="small" style={{ margin: "0 0 3px" }}><a href="/events">Events</a></p>
              <p className="small" style={{ margin: "0 0 3px" }}><a href="/messages">Messages</a></p>
              <p className="small" style={{ margin: "0 0 3px" }}><a href="/venues">Venues</a></p>
            </div>
            <div>
              <p className="eyebrow" style={{ marginBottom: 6 }}>Account</p>
              <p className="small" style={{ margin: "0 0 3px" }}><a href="/pricing">Pricing</a></p>
              <p className="small" style={{ margin: "0 0 3px" }}><a href="/profile">Profile</a></p>
              <p className="small" style={{ margin: "0 0 3px" }}><a href="/billing">Billing</a></p>
            </div>
            <div>
              <p className="eyebrow" style={{ marginBottom: 6 }}>Legal</p>
              <p className="small" style={{ margin: "0 0 3px" }}><a href="/legal/privacy">Privacy Policy</a></p>
              <p className="small" style={{ margin: "0 0 3px" }}><a href="/legal/terms">Terms of Service</a></p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
