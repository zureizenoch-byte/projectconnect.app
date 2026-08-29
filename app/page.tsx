import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

const FEATURES = [
  ['01', 'Matched meetups', 'Small, real-world groups matched by role and domain — not another networking mixer where you talk to no one relevant.'],
  ['02', 'Speaker Series', 'Small, matched sessions with senior leaders — direct access, not a broadcast webinar with a thousand other attendees.'],
  ['03', 'Talent pipeline', "Opt in when you're ready. You control what other members can see, and who may contact you about matched rooms."],
  ['04', 'City chapters', 'Vancouver and Toronto at launch, each with a Chapter Lead running the local schedule and keeping the room worth showing up to.'],
];

export default async function Home() {
  const session = await getSession();
  if (session) redirect('/dashboard');

  return (
    <main>
      <section style={{ position: 'relative', overflow: 'hidden', background: 'var(--ink)', color: '#fff' }}>
        <span aria-hidden style={{
          position: 'absolute', top: -220, left: '50%', transform: 'translateX(-50%)',
          width: 900, height: 520, borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(90,116,224,.36), transparent)',
          filter: 'blur(20px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'relative', maxWidth: 1000, margin: '0 auto', textAlign: 'center',
          padding: 'clamp(56px,8vw,120px) clamp(16px,4vw,40px) clamp(40px,5vw,72px)',
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
            fontSize: 12.5, letterSpacing: '.06em', textTransform: 'uppercase', color: '#c6cef9',
            background: 'rgba(255,255,255,.08)', border: '1px solid var(--line-d)',
            borderRadius: 99, padding: '6px 14px',
          }}>Vancouver · Toronto</span>
          <h1 style={{
            fontSize: 'clamp(44px,7.2vw,104px)', lineHeight: .98,
            letterSpacing: '-0.025em', margin: '24px 0 0', color: '#fff',
          }}>
            The network transformation professionals{' '}
            <span style={{
              background: 'linear-gradient(100deg,#b3c0f8,#4b62d8)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>actually need.</span>
          </h1>
          <p style={{
            fontSize: 'clamp(16px,1.4vw,19px)', lineHeight: 1.6,
            margin: '26px auto 0', maxWidth: '62ch', color: 'var(--mute-d)',
          }}>
            Matched real-world meetups, Speaker-led access, and a talent pipeline recruiters can
            actually use — for PM, Product, Agile, QA, Data, Cyber, Cloud, and Delivery professionals.
          </p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 34 }}>
            <a className="btn btn-gold" href="/signup"
              style={{ minHeight: 52, padding: '0 28px', fontSize: 16 }}>Join Project Connect</a>
            <a className="btn btn-ondark" href="/pricing"
              style={{ minHeight: 52, padding: '0 28px', fontSize: 16 }}>See pricing</a>
          </div>
        </div>

        <div style={{ position: 'relative', maxWidth: 1160, margin: '0 auto', padding: '0 clamp(16px,4vw,40px)' }}>
          <figure style={{
            margin: 0, position: 'relative', overflow: 'hidden',
            WebkitMaskImage: 'radial-gradient(120% 100% at 50% 0%, #000 42%, rgba(0,0,0,.55) 72%, transparent 100%)',
            maskImage: 'radial-gradient(120% 100% at 50% 0%, #000 42%, rgba(0,0,0,.55) 72%, transparent 100%)',
          }}>
            <img src="/hero-chapter-meetup.png" alt=""
              style={{ display: 'block', width: '100%', aspectRatio: '21 / 9',
                objectFit: 'cover', filter: 'saturate(.85) contrast(1.02)',
                background: 'linear-gradient(150deg,#1a2148,#3352cf)' }} />
            <span aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(to bottom, rgba(13,19,48,.35) 0%, rgba(13,19,48,.05) 40%, rgba(13,19,48,.45) 100%)',
              mixBlendMode: 'multiply' }} />
            <span aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'radial-gradient(90% 70% at 50% 10%, rgba(51,82,207,.24), transparent 70%)' }} />
          </figure>
        </div>
      </section>

      <section style={{ maxWidth: 1260, margin: '0 auto', padding: 'clamp(52px,7vw,104px) clamp(16px,4vw,40px)' }}>
        <div style={{ maxWidth: '34ch' }}>
          <p className="eyebrow">Why it's different</p>
          <h2 style={{ fontSize: 'clamp(30px,3.6vw,50px)', lineHeight: 1.04, margin: '14px 0 0' }}>
            Built for people who are tired of networking that goes nowhere.
          </h2>
        </div>
        <div className="grid g2" style={{ marginTop: 44 }}>
          {FEATURES.map(([num, title, body]) => (
            <article key={num} className="surf lift" style={{
              padding: 26, display: 'flex', flexDirection: 'column', gap: 12,
              background: 'linear-gradient(180deg,#fff,#fdfcfa)',
            }}>
              <span style={{
                width: 36, height: 36, borderRadius: 11, display: 'grid', placeItems: 'center',
                background: 'var(--gold-100)', border: '1px solid var(--gold-200)',
                fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--gold-700)', fontSize: 15,
              }}>{num}</span>
              <h3 style={{ margin: 0 }}>{title}</h3>
              <p className="mute" style={{ fontSize: 14.5, lineHeight: 1.65, margin: 0 }}>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1260, margin: '0 auto', padding: '0 clamp(16px,4vw,40px) clamp(52px,7vw,104px)' }}>
        <div style={{
          position: 'relative', overflow: 'hidden', borderRadius: 24,
          background: 'var(--ink)', color: '#fff', padding: 'clamp(30px,4.5vw,64px)',
          display: 'grid', gridTemplateColumns: 'minmax(0,7fr) minmax(0,5fr)', gap: 32, alignItems: 'center',
        }}>
          <span aria-hidden style={{
            position: 'absolute', right: -160, bottom: -200, width: 520, height: 420,
            borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(51,82,207,.32), transparent)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative' }}>
            <h2 style={{ fontSize: 'clamp(28px,3.4vw,46px)', lineHeight: 1.03, margin: 0, color: '#fff' }}>
              Your next meetup is one signup away.
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, margin: '16px 0 0', color: 'var(--mute-d)' }}>
              Free to join. Map your experience once, and let matching do the rest.
            </p>
          </div>
          <div className="row" style={{ position: 'relative', justifyContent: 'flex-end' }}>
            <a className="btn btn-gold" href="/signup"
              style={{ minHeight: 50, padding: '0 26px', fontSize: 15 }}>Join Project Connect</a>
            <a className="btn btn-ondark" href="/pricing"
              style={{ minHeight: 50, padding: '0 26px', fontSize: 15 }}>Compare plans</a>
          </div>
        </div>
      </section>
    </main>
  );
}
