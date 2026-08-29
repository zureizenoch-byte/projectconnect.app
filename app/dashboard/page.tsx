import { requireSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { isPaid } from '@/lib/tiers';
import { mapsUrl } from '@/lib/matching';
import { TAG_CATEGORIES } from '@/lib/types';
import { PostForm } from './PostForm';

export const metadata = { title: 'Dashboard — Project Connect' };

export default async function DashboardPage() {
  const { user, profile, subscription } = await requireSession();
  const supabase = createClient();
  const paid = isPaid(subscription.tier, subscription.status, subscription.current_period_end);

  const [{ data: seats }, { data: tags }, { data: posts }] = await Promise.all([
    supabase.from('event_seats')
      .select('id,status,table_no,events(id,title,kind,starts_at,seat_cap,venues(name,address))')
      .eq('profile_id', user.id).neq('status', 'cancelled')
      .order('created_at', { ascending: false }),
    supabase.from('profile_tags').select('category').eq('profile_id', user.id),
    supabase.from('posts')
      .select('id,body,created_at,profiles(full_name,photo_url,role_level)')
      .eq('chapter_id', profile.chapter_id ?? '')
      .order('created_at', { ascending: false }).limit(20),
  ]);

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

      <h2 style={{ marginTop: 34 }}>Chapter feed</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,7fr) minmax(0,4fr)', marginTop: 16, alignItems: 'start' }}>
        <div className="grid" style={{ gap: 14 }}>
          <PostForm />
          {(posts ?? []).map((p: any) => (
            <article key={p.id} className="surf" style={{ padding: 20 }}>
              <div className="row">
                <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gold-100)',
                  backgroundImage: p.profiles?.photo_url ? 'url(' + p.profiles.photo_url + ')' : undefined,
                  backgroundSize: 'cover' }} />
                <div>
                  <strong>{p.profiles?.full_name ?? 'Member'}</strong>
                  <p className="small mute" style={{ margin: 0 }}>{p.profiles?.role_level}</p>
                </div>
                <span className="small mute" style={{ marginLeft: 'auto' }}>
                  {new Date(p.created_at).toLocaleDateString('en-CA', { dateStyle: 'medium' })}
                </span>
              </div>
              <p style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{p.body}</p>
            </article>
          ))}
          {!posts?.length && <p className="mute">No posts in your chapter yet.</p>}
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
