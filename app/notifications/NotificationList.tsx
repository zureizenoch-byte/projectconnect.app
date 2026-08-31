'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markAllRead, clearRead, markNotificationRead } from '@/app/actions/notifications';

export function NotificationList({ items }: { items: any[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const unread = items.filter((n) => !n.read_at).length;

  const ago = (iso: string) => {
    const mins = Math.floor((Date.now() - +new Date(iso)) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs / 24);
    if (days < 7) return days + 'd ago';
    return new Date(iso).toLocaleDateString('en-CA', { dateStyle: 'medium' });
  };

  return (
    <>
      <div className="row" style={{ gap: 10, marginTop: 20 }}>
        <button className="btn btn-out" disabled={pending || unread === 0}
          onClick={() => start(async () => { await markAllRead(); router.refresh(); })}>
          {unread > 0 ? 'Mark all read (' + unread + ')' : 'All read'}
        </button>
        <button className="btn btn-quiet" disabled={pending}
          onClick={() => start(async () => { await clearRead(); router.refresh(); })}>
          Clear read
        </button>
      </div>

      <div className="surf" style={{ marginTop: 18, overflow: 'hidden' }}>
        {items.length === 0 ? (
          <p className="mute" style={{ padding: 30, margin: 0, textAlign: 'center' }}>
            Nothing yet. RSVP to an event and updates will land here.
          </p>
        ) : items.map((n) => (
          <a key={n.id} href={n.href ?? '#'}
            onClick={() => { if (!n.read_at) markNotificationRead(n.id); }}
            style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              padding: '16px 20px', borderBottom: '1px solid var(--line)',
              color: 'inherit', textDecoration: 'none',
              background: n.read_at ? undefined : 'var(--gold-100)',
            }}>
            <span aria-hidden style={{
              display: 'grid', placeItems: 'center', width: 38, height: 38, flex: 'none',
              borderRadius: '50%', background: '#fff', border: '1px solid var(--line)',
              color: n.tone, fontSize: 16,
            }}>{n.glyph}</span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: n.read_at ? 500 : 600 }}>{n.title}</p>
              {n.body && (
                <p className="mute" style={{ margin: '3px 0 0', fontSize: 14.5, lineHeight: 1.55 }}>
                  {n.body}
                </p>
              )}
            </div>

            <span className="mute" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{ago(n.created_at)}</span>
          </a>
        ))}
      </div>
    </>
  );
}
