import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { Avatar } from '@/components/Avatar';
import { Composer } from '../Composer';
import { ThreadActions } from '../ThreadActions';
import { markRead } from '@/app/actions/messages';

export const dynamic = 'force-dynamic';

export default async function Thread({ params }: { params: { id: string } }) {
  const { user } = await requireSession();
  const db = createAdminClient();

  const { data: me } = await db.from('conversation_participants')
    .select('profile_id').eq('conversation_id', params.id).eq('profile_id', user.id).maybeSingle();
  if (!me) notFound();

  const { data: otherRow } = await db.from('conversation_participants')
    .select('profile_id').eq('conversation_id', params.id).neq('profile_id', user.id).maybeSingle();

  const { data: other } = otherRow
    ? await db.from('profiles').select('id,full_name,photo_url,role_level,employer')
        .eq('id', otherRow.profile_id).maybeSingle()
    : { data: null };

  const { data: messages } = await db.from('messages')
    .select('id,body,created_at,sender_id,deleted_at')
    .eq('conversation_id', params.id).order('created_at');

  const { data: block } = other
    ? await db.from('blocks').select('blocker_id')
        .or('and(blocker_id.eq.' + user.id + ',blocked_id.eq.' + other.id + '),' +
            'and(blocker_id.eq.' + other.id + ',blocked_id.eq.' + user.id + ')')
    : { data: [] as any[] };

  const iBlocked = (block ?? []).some((b: any) => b.blocker_id === user.id);
  const theyBlocked = (block ?? []).some((b: any) => b.blocker_id !== user.id);

  await markRead(params.id);

  return (
    <main className="wrap" style={{ maxWidth: 760 }}>
      <a href="/messages" className="small mute">← All messages</a>

      <header className="surf" style={{ padding: 20, marginTop: 14 }}>
        <div className="row" style={{ gap: 14 }}>
          <Avatar src={other?.photo_url} name={other?.full_name} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <a href={'/members/' + (other?.id ?? '')}
              style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 22, color: 'var(--ink)' }}>
              {other?.full_name || 'Member'}
            </a>
            {other?.role_level && (
              <p className="mute small" style={{ margin: '2px 0 0' }}>
                {other.role_level}{other.employer ? ' · ' + other.employer : ''}
              </p>
            )}
          </div>
          {other && (
            <ThreadActions
              conversationId={params.id}
              otherId={other.id}
              otherName={other.full_name || 'this member'}
              iBlocked={iBlocked}
            />
          )}
        </div>
      </header>

      <div className="grid" style={{ gap: 10, marginTop: 18 }}>
        {(messages ?? []).length === 0 && (
          <p className="mute" style={{ textAlign: 'center', padding: 24 }}>
            No messages yet. Say hello.
          </p>
        )}
        {(messages ?? []).map((m: any) => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '78%', padding: '11px 15px', borderRadius: 16,
                borderBottomRightRadius: mine ? 4 : 16,
                borderBottomLeftRadius: mine ? 16 : 4,
                background: mine ? 'var(--gold-700)' : '#fff',
                color: mine ? '#fff' : 'var(--ink)',
                border: mine ? 'none' : '1px solid var(--line)',
                boxShadow: 'var(--sh)',
              }}>
                <p style={{
                  margin: 0, fontSize: 15.5, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                  fontStyle: m.deleted_at ? 'italic' : undefined,
                  opacity: m.deleted_at ? .6 : 1,
                }}>
                  {m.deleted_at ? 'Message deleted' : m.body}
                </p>
                <span style={{
                  display: 'block', marginTop: 5, fontSize: 11.5,
                  color: mine ? 'rgba(255,255,255,.7)' : 'var(--mute)',
                }}>
                  {new Date(m.created_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {iBlocked ? (
        <div className="surf" style={{ padding: 20, marginTop: 18, textAlign: 'center' }}>
          <p className="mute" style={{ margin: 0 }}>
            You blocked this member. Unblock them to send a message.
          </p>
        </div>
      ) : theyBlocked ? (
        <div className="surf" style={{ padding: 20, marginTop: 18, textAlign: 'center' }}>
          <p className="mute" style={{ margin: 0 }}>You can no longer message this member.</p>
        </div>
      ) : (
        <Composer conversationId={params.id} />
      )}
    </main>
  );
}
