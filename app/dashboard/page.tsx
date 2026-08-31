import { requireSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { isPaid } from '@/lib/tiers';
import { mapsUrl } from '@/lib/matching';
import { TAG_CATEGORIES } from '@/lib/types';
import { PostForm } from './PostForm';
import { Avatar } from '@/components/Avatar';
import { PostActions } from './PostActions';
import { PostEngagement } from './PostEngagement';

export const metadata = { title: 'Dashboard — Project Connect' };

export default async function DashboardPage() {
  const { user, profile, subscription } = await requireSession();
  const supabase = createClient();
  const paid = isPaid(subscription.tier, subscription.status, subscription.current_period_end);

  const [{ data: seats }, { data: tags }, { data: posts, error: postsError }] = await Promise.all([
    supabase.from('event_seats')
      .select('id,status,table_no,events(id,title,kind,starts_at,seat_cap,venues(name,address))')
      .eq('profile_id', user.id).neq('status', 'cancelled')
      .order('created_at', { ascending: false }),
    supabase.from('profile_tags').select('category').eq('profile_id', user.id),
    supabase.from('posts')
      .select('id,body,created_at,author_id,chapter_id')
      .order('created_at', { ascending: false }).limit(50),
  ]);

  const postIds = (posts ?? []).map((p: any) => p.id);
  const authorIds = Array.from(new Set((posts ?? []).map((p: any) => p.author_id)));

  const safe = async (fn: () => any): Promise<any[]> => {
    try {
      const res = await fn();
      return res?.data ?? [];
    } catch {
      return [];
    }
  };

  const PERSON = 'id,full_name,photo_url,role_level,city';

  const [authors, likes, comments] = await Promise.all([
    authorIds.length
      ? safe(() => supabase.from('profiles').select(PERSON).in('id', authorIds))
      : Promise.resolve([] as any[]),
    postIds.length
      ? safe(() => supabase.from('post_likes').select('post_id,profile_id').in('post_id', postIds))
      : Promise.resolve([] as any[]),
    postIds.length
      ? safe(() => supabase.from('post_comments').select('id,post_id,body,created_at,author_id').in('post_id', postIds))
      : Promise.resolve([] as any[]),
  ]);

  const authorMap = new Map<string, any>((authors ?? []).map((a: any) => [a.id, a]));
  // always trust the session for your own rows, even if the lookup is blocked
  authorMap.set(user.id, {
    id: user.id,
    full_name: profile.full_name ?? authorMap.get(user.id)?.full_name ?? null,
    photo_url: profile.photo_url ?? authorMap.get(user.id)?.photo_url ?? null,
    role_level: profile.role_level ?? authorMap.get(user.id)?.role_level ?? null,
    city: profile.city ?? authorMap.get(user.id)?.city ?? null,
  });

  const commenterIds = Array.from(new Set((comments ?? []).map((c: any) => c.author_id)))
    .filter((id: any) => !authorMap.has(id));
  if (commenterIds.length) {
    const extra = await safe(() => supabase.from('profiles').select(PERSON).in('id', commenterIds));
    for (const a of extra) authorMap.set(a.id, a);
  }

  const upcoming: any[] = (seats ?? [])
    .filter((s: any) => s.events && new Date(s.events.starts_at) > new Date())
    .sort((a: any, b: any) => +new Date(a.events.starts_at) - +new Date(b.events.starts_at));
  const next = upcoming[0];

  const filledGroups = new Set((tags ?? []).map((t: any) => t.category)).size;
  const strength = Math.round((filledGroups / TAG_CATEGORIES.length) * 100);

  return (
    <main className="wrap">
      <h1>Dashboard</h1>
      <p className="mute" style={{ marginTop: 10 }}>
        {paid ? subscription.tier.replace('_', ' ') : 'Free'} member · {profile.city ?? 'No chapter yet'}
      </p>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,5fr) minmax(0,3fr) minmax(0,4fr)', marginTop: 26 }}>
        <div className="surf" style={{ padding: 24, background: 'linear-gradient(160deg,var(--gold-100),#fff)' }}>
          <p className="eyebrow">Your next event</p>
          {next ? (
            <>
              <h2 style={{ marginTop: 10, fontSize: 24 }}>{next.events.title}</h2>
              <p className="mute" style={{ marginTop: 8 }}>
                {new Date(next.events.starts_at).toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'short' })}
              </p>
              <p className="mute">{next.events.venues?.name}{next.table_no ? ' · Table ' + next.table_no : ''}</p>
              <div className="row" style={{ marginTop: 18 }}>
                {next.events.venues?.address && (
                  <a className="btn btn-out" target="_blank" rel="noopener noreferrer"
                    href={mapsUrl(next.events.venues.address)}>Directions</a>
                )}
                <a className="btn btn-gold" href="/events">See all events</a>
              </div>
            </>
          ) : (
            <>
              <p style={{ marginTop: 10 }}>Nothing booked yet.</p>
              <a className="btn btn-gold" href="/events" style={{ marginTop: 14 }}>Find an event</a>
            </>
          )}
        </div>

        <div className="surf" style={{ padding: 24 }}>
          <p className="eyebrow">Profile strength</p>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: 40, margin: '10px 0 0' }}>{strength}%</p>
          <div style={{ height: 8, borderRadius: 99, background: 'var(--gold-100)', marginTop: 12, overflow: 'hidden' }}>
            <span style={{ display: 'block', width: strength + '%', height: '100%',
              background: 'linear-gradient(90deg,var(--gold),var(--gold-700))' }} />
          </div>
          <p className="small mute" style={{ marginTop: 10 }}>
            {strength < 100 ? 'Fill in more groups under Your experience to sharpen matching.' : 'Fully mapped.'}
          </p>
          <a className="btn btn-out" href="/profile" style={{ marginTop: 14, width: '100%' }}>Edit profile</a>
        </div>

        <div className="surf" style={{ padding: 24 }}>
          <p className="eyebrow">My RSVPs</p>
          <div className="grid" style={{ gap: 10, marginTop: 14 }}>
            {(seats ?? []).slice(0, 5).map((s: any) => (
              <div key={s.id} className="row" style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: 15 }}>{s.events?.title}</strong>
                  <p className="small mute" style={{ margin: '2px 0 0' }}>
                    {s.events && new Date(s.events.starts_at).toLocaleDateString('en-CA', { dateStyle: 'medium' })}
                  </p>
                </div>
                <span className={'pill ' + (s.status === 'confirmed' ? 'pill-ok' : s.status === 'waitlist' ? 'pill-off' : 'pill-wait')}>
                  {s.status}
                </span>
              </div>
            ))}
            {!seats?.length && <p className="small mute">No RSVPs yet.</p>}
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 34 }}>Feed</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,7fr) minmax(0,4fr)', marginTop: 16, alignItems: 'start' }}>
        <div className="grid" style={{ gap: 14 }}>
          <PostForm />
          {(posts ?? []).map((p: any) => (
            <article key={p.id} id={'post-' + p.id} className="surf lift" style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <a href={'/members/' + p.author_id} aria-label="View profile" style={{ flex: 'none' }}>
                  <Avatar src={authorMap.get(p.author_id)?.photo_url}
                    name={authorMap.get(p.author_id)?.full_name} size={64} />
                </a>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <a href={'/members/' + p.author_id}
                    style={{ fontWeight: 600, fontSize: 19, color: 'var(--ink)', textDecoration: 'none' }}>
                    {authorMap.get(p.author_id)?.full_name ?? 'Member'}
                  </a>
                  {authorMap.get(p.author_id)?.role_level && (
                    <p className="mute" style={{ fontSize: 15, margin: '3px 0 0' }}>
                      {authorMap.get(p.author_id).role_level}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  {authorMap.get(p.author_id)?.city && (
                    <span className="pill pill-wait" style={{ whiteSpace: 'nowrap' }}>
                      {authorMap.get(p.author_id).city}
                    </span>
                  )}
                  <span className="mute" style={{ fontSize: 13.5, whiteSpace: 'nowrap' }}>
                    {new Date(p.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 16.5, lineHeight: 1.7, margin: '18px 0 0', whiteSpace: 'pre-wrap' }}>{p.body}</p>
              <footer className="row" style={{ gap: 6, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                <span style={{ marginRight: 'auto' }} />
                {(p.author_id === user.id || profile.role === 'admin') && <PostActions postId={p.id} />}
              </footer>
              <PostEngagement
                postId={p.id}
                likeCount={(likes ?? []).filter((l: any) => l.post_id === p.id).length}
                liked={(likes ?? []).some((l: any) => l.post_id === p.id && l.profile_id === user.id)}
                comments={(comments ?? [])
                  .filter((c: any) => c.post_id === p.id)
                  .sort((a: any, b: any) => +new Date(a.created_at) - +new Date(b.created_at))
                  .map((c: any) => ({ ...c, commenter: authorMap.get(c.author_id) }))}
                userId={user.id}
                isAdmin={profile.role === 'admin'}
              />
            </article>
          ))}
          {postsError && (
            <div className="surf" style={{ padding: 18, borderColor: 'var(--err)' }}>
              <strong style={{ color: 'var(--err)' }}>Feed could not load</strong>
              <p className="small mute" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{postsError.message}</p>
            </div>
          )}
          {!postsError && !posts?.length && <p className="mute">No posts yet. Write the first one above.</p>}
        </div>

        <aside className="surf" style={{ padding: 22, position: 'sticky', top: 84 }}>
          <p className="eyebrow">Your chapter</p>
          <h3 style={{ marginTop: 10 }}>{profile.city ?? 'Pick a chapter'}</h3>
          <p className="small mute" style={{ marginTop: 8 }}>
            {paid ? 'Unlimited events and Speaker Series talks.' : 'Free covers one event per cycle. Talks need a paid plan.'}
          </p>
          <div className="grid" style={{ gap: 8, marginTop: 16 }}>
            <a className="btn btn-gold" href="/events">See events</a>
            <a className="btn btn-out" href="/venues">Chapter venues</a>
            {!paid && <a className="btn btn-out" href="/pricing">Compare plans</a>}
          </div>
        </aside>
      </div>
    </main>
  );
}
