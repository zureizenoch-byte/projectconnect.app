import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const FEATURES = [
  ['01', 'Matched, not mass', 'Tables of twelve to fifteen, grouped by domain and role level — not a room of two hundred strangers.'],
  ['02', 'Speaker Series access', 'Directors and heads of function host small sessions you can actually ask questions in.'],
  ['03', 'Mapped once', 'Your domains, transformation types, methods and industries drive every match. Fill it in once.'],
  ['04', 'By city chapter', 'Vancouver and Toronto today, run by Chapter Leads who know the venues and the people.'],
];

export default async function Home() {
  const session = await getSession();
  if (session) redirect('/dashboard');

  const supabase = createClient();
  const { data: events } = await supabase
    .from('events')
    .select('id,title,kind,starts_at,chapters(city),venues(name)')
    .eq('status', 'published')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')
    .limit(3);

  return (
    <main>
      <section className="ondark" style={{ position: 'relative', overflow: 'hidden' }}>
        <span aria-hidden style={{
          position: 'absolute', top: -220, left: '50%', transform: 'translateX(-50%)',
          width: 900, height: 520, borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(90,116,224,.36), transparent)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'relative', maxWidth: 1000, margin: '0 auto', textAlign: 'center',
          padding: 'clamp(56px,8vw,120px) clamp(16px,4vw,40px) clamp(40px,5vw,72px)',
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
            fontSize: 12.5, letterSpacing: '.06em', textTransform: 'uppercase', color: '#c6cef9',
            background: 'rgba(255,255,255,.08)', border: '1px solid var(--line-d)',
            borderRadius: 999, padding: '7px 15px',
          }}>
            Vancouver · Toronto
          </span>
          <h1 style={{
            fontSize: 'clamp(44px,7.2vw,104px)', lineHeight: .98,
            letterSpacing: '-0.025em', margin: '24px 0 0',
          }}>
            Small rooms, matched by what you actually deliver.
          </h1>
          <p style={{
            fontSize: 'clamp(16px,1.4vw,19px)', lineHeight: 1.6,
            margin: '26px auto 0', maxWidth: '62ch', color: 'var(--mute-d)',
          }}>
            Matched real-world meetups and Speaker Series access for PM, Product, Agile, QA, Data,
            Cyber, Cloud and Delivery professionals.
          </p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 34 }}>
            <a className="btn btn-gold" href="/signup"
              style={{ minHeight: 52, padding: '0 28px', fontSize: 16 }}>Join Project Connect</a>
            <a className="btn btn-ondark" href="/pricing"
              style={{ minHeight: 52, padding: '0 28px', fontSize: 16 }}>See pricing</a>
          </div>
        </div>
      </section>

      <section className="wrap" style={{ paddingBlock: 'clamp(52px,7vw,104px)' }}>
        <div style={{ maxWidth: '34ch' }}>
          <p className="eyebrow">Why it's different</p>
          <h2 style={{ fontSize: 'clamp(30px,3.6vw,50px)', margin: '14px 0 0' }}>
            Built for people who are tired of networking events.
          </h2>
        </div>
        <div className="grid g2" style={{ marginTop: 44 }}>
          {FEATURES.map(([n, title, body]) => (
            <article key={n} className="surf lift"
              style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 12,
                background: 'linear-gradient(180deg,#fff,#fcfcff)' }}>
              <span style={{
                width: 36, height: 36, borderRadius: 11, display: 'grid', placeItems: 'center',
                background: 'var(--gold-100)', border: '1px solid var(--gold-200)',
                fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--gold-700)',
              }}>{n}</span>
              <h3 style={{ margin: 0 }}>{title}</h3>
              <p className="mute" style={{ fontSize: 15, lineHeight: 1.65, margin: 0 }}>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 0 }}>
        <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <h2>What's next</h2>
          <a href="/events" style={{ fontSize: 15 }}>All events →</a>
        </div>
        <div className="grid g3" style={{ marginTop: 20 }}>
          {(events ?? []).map((e: any) => {
            const d = new Date(e.starts_at);
            return (
              <a key={e.id} href={'/events/' + e.id} className="surf lift"
                style={{ padding: 24, display: 'block', color: 'inherit' }}>
                <p className="eyebrow">
                  {e.chapters?.city} · {e.kind === 'talk' ? 'Speaker Series' : 'Meetup'}
                </p>
                <h3 style={{ marginTop: 12 }}>{e.title}</h3>
                <p className="mute small" style={{ marginTop: 8 }}>
                  {d.toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}
                  {e.venues?.name ? ' · ' + e.venues.name : ''}
                </p>
              </a>
            );
          })}
          {!events?.length && <p className="mute">No published events yet.</p>}
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 0 }}>
        <div className="ondark" style={{
          position: 'relative', overflow: 'hidden', borderRadius: 24,
          padding: 'clamp(34px,5vw,64px)',
        }}>
          <span aria-hidden style={{
            position: 'absolute', right: -160, bottom: -200, width: 520, height: 420,
            borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(51,82,207,.32), transparent)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative' }}>
            <h2 style={{ fontSize: 'clamp(28px,3.4vw,46px)', margin: 0 }}>
              Your next meetup is one signup away.
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, margin: '16px 0 0', color: 'var(--mute-d)' }}>
              Free to join. Map your experience once, and let matching do the rest.
            </p>
            <div className="row" style={{ marginTop: 28 }}>
              <a className="btn btn-gold" href="/signup"
                style={{ minHeight: 50, padding: '0 26px', fontSize: 16 }}>Create your account</a>
              <a className="btn btn-ondark" href="/events"
                style={{ minHeight: 50, padding: '0 26px', fontSize: 16 }}>Browse events</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
