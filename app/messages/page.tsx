import { requireSession } from '@/lib/auth';
import { getConversations } from '@/lib/messages';
import { Avatar } from '@/components/Avatar';

export const metadata = { title: 'Messages — Project Connect' };
export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const { user } = await requireSession();
  const conversations = await getConversations(user.id);

  return (
    <main className="wrap" style={{ maxWidth: 820 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>Messages</h1>
          <p className="mute" style={{ marginTop: 10 }}>
            Direct conversations with other members.
          </p>
        </div>
        <a className="btn btn-out" href="/settings/blocked"
          style={{ minHeight: 40, padding: '0 16px', fontSize: 14 }}>Blocked members</a>
      </div>

      <div className="surf" style={{ marginTop: 24, overflow: 'hidden' }}>
        {conversations.length === 0 ? (
          <p className="mute" style={{ padding: 28, margin: 0 }}>
            No conversations yet. Open a member's profile and choose Message to start one.
          </p>
        ) : conversations.map((c) => (
          <a key={c.id} href={'/messages/' + c.id}
            style={{
              display: 'flex', gap: 14, alignItems: 'center', padding: '16px 20px',
              borderBottom: '1px solid var(--line)', color: 'inherit',
              background: c.unread ? 'var(--gold-100)' : undefined,
            }}>
            <Avatar src={c.otherPhoto} name={c.otherName} size={52} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row" style={{ gap: 8 }}>
                <strong style={{ fontSize: 16.5 }}>{c.otherName}</strong>
                {c.blocked && <span className="pill pill-off">Blocked</span>}
                {c.unread && <span className="pill pill-wait">New</span>}
              </div>
              <p className="mute small" style={{
                margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {c.lastSenderId === user.id ? 'You: ' : ''}{c.lastBody ?? 'No messages yet'}
              </p>
            </div>
            <span className="mute small" style={{ whiteSpace: 'nowrap' }}>
              {new Date(c.lastAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
            </span>
          </a>
        ))}
      </div>
    </main>
  );
}
