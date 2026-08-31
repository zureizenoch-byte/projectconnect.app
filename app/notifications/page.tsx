import { requireSession } from '@/lib/auth';
import { getNotifications, notificationGlyph, notificationTone } from '@/lib/notifications';
import { NotificationList } from './NotificationList';

export const metadata = { title: 'Notifications — Project Connect' };
export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const { user } = await requireSession();
  const items = await getNotifications(user.id, 60);

  const decorated = items.map((n) => ({
    ...n,
    glyph: notificationGlyph(n.kind),
    tone: notificationTone(n.kind),
  }));

  return (
    <main className="wrap" style={{ maxWidth: 780 }}>
      <h1>Notifications</h1>
      <p className="mute" style={{ marginTop: 10 }}>
        Seat confirmations, event changes, messages and approvals.
      </p>
      <NotificationList items={decorated} />
    </main>
  );
}
