import { requireSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { Avatar } from '@/components/Avatar';
import { UnblockButton } from './UnblockButton';

export const metadata = { title: 'Blocked members — Project Connect' };
export const dynamic = 'force-dynamic';

export default async function BlockedPage() {
  const { user } = await requireSession();
  const db = createAdminClient();

  const { data: blocks } = await db.from('blocks')
    .select('blocked_id,reason,created_at').eq('blocker_id', user.id).order('created_at', { ascending: false });

  const ids = (blocks ?? []).map((b: any) => b.blocked_id);
  const { data: people } = ids.length
    ? await db.from('profiles').select('id,full_name,photo_url,role_level').in('id', ids)
    : { data: [] as any[] };
  const byId = new Map((people ?? []).map((p: any) => [p.id, p]));

  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      <a href="/messages" className="small mute">← Messages</a>
      <h1 style={{ marginTop: 14 }}>Blocked members</h1>
      <p className="mute" style={{ marginTop: 10, maxWidth: '58ch' }}>
        Blocked members cannot message you, and you cannot message them. They are not told they've been blocked.
      </p>

      <div className="surf" style={{ marginTop: 24, overflow: 'hidden' }}>
        {(blocks ?? []).length === 0 ? (
          <p className="mute" style={{ padding: 26, margin: 0 }}>You haven't blocked anyone.</p>
        ) : (blocks ?? []).map((b: any) => {
          const p = byId.get(b.blocked_id);
          return (
            <div key={b.blocked_id} className="row"
              style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', gap: 14 }}>
              <Avatar src={p?.photo_url} name={p?.full_name} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{p?.full_name || 'Member'}</strong>
                <p className="mute small" style={{ margin: '2px 0 0' }}>
                  Blocked {new Date(b.created_at).toLocaleDateString('en-CA', { dateStyle: 'medium' })}
                  {b.reason ? ' · ' + b.reason : ''}
                </p>
              </div>
              <UnblockButton id={b.blocked_id} />
            </div>
          );
        })}
      </div>
    </main>
  );
}
