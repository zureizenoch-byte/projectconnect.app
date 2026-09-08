import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';


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
          }}>Vancouver</span>
          <h1 style={{
            fontSize: 'clamp(44px,7.2vw,104px)', lineHeight: .98,
            letterSpacing: '-0.025em', margin: '24px 0 0', color: '#fff',
          }}>
            <span style={{
              background: 'linear-gradient(100deg,#f0d9a8,#c9922f)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>Good coffee</span>{' '}
            and the people who make projects happen.
          </h1>
          <p style={{
            fontSize: 'clamp(17px,1.5vw,21px)', lineHeight: 1.65,
            margin: '26px auto 0', maxWidth: '58ch', color: 'rgba(255,255,255,.92)',
          }}>
            Real-world coffee meetups, speaker-led sessions, and genuine connections
            for project delivery professionals.
          </p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 34 }}>
            <a className="btn btn-gold" href="/signup"
              style={{ minHeight: 52, padding: '0 28px', fontSize: 16 }}>Join Project Connect</a>
            <a className="btn btn-ondark" href="/events"
              style={{ minHeight: 52, padding: '0 28px', fontSize: 16 }}>See events</a>
          </div>
        </div>

        <p style={{
          position: 'relative', margin: '0 auto', padding: '0 clamp(16px,4vw,40px) clamp(30px,4.5vw,52px)',
          maxWidth: 900, textAlign: 'center',
          fontFamily: 'var(--font-heading)', fontWeight: 500,
          fontSize: 'clamp(20px,2.2vw,30px)', lineHeight: 1.25, letterSpacing: '-0.01em',
          color: '#fff',
        }}>
          We’re redefining networking — one coffee at a time.
        </p>

        <div style={{
          position: 'relative', maxWidth: 1160, margin: '0 auto',
          padding: '0 clamp(16px,4vw,40px)', marginBottom: 'clamp(-120px,-9vw,-40px)',
        }}>
          <figure style={{
            margin: 0, position: 'relative', overflow: 'hidden',
            WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 38%, rgba(0,0,0,.55) 68%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, #000 0%, #000 38%, rgba(0,0,0,.55) 68%, transparent 100%)',
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

        <div style={{
          position: 'relative', maxWidth: 1260, margin: '0 auto',
          padding: 'clamp(20px,3vw,40px) clamp(16px,4vw,40px) clamp(52px,7vw,96px)',
          display: 'grid', gridTemplateColumns: 'minmax(0,7fr) minmax(0,5fr)',
          gap: 32, alignItems: 'center',
        }}>
          <span aria-hidden style={{
            position: 'absolute', right: -200, bottom: -240, width: 620, height: 460,
            borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(51,82,207,.28), transparent)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative' }}>
            <h2 style={{ fontSize: 'clamp(28px,3.4vw,46px)', lineHeight: 1.03, margin: 0, color: '#fff' }}>
              Your next meetup is one signup away.
            </h2>
          </div>
        </div>
      </section>

      <section style={{
        maxWidth: 1260, margin: '0 auto',
        padding: 'clamp(64px,8vw,120px) clamp(16px,4vw,40px) clamp(52px,7vw,96px)',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'clamp(28px,4vw,56px)', alignItems: 'start',
        }}>
          <div>
            <p className="eyebrow">What we are</p>
            <h2 style={{
              fontSize: 'clamp(30px,3.6vw,50px)', lineHeight: 1.04, margin: '14px 0 0',
            }}>
              Project Connect is built around three things: connect, share and grow.
            </h2>
            <p style={{
              fontSize: 18, lineHeight: 1.7, margin: '20px 0 0', maxWidth: '46ch',
              color: 'var(--mute)',
            }}>
              We bring together the people who make projects happen — Project Managers,
              Product Managers, Scrum Masters, Analysts, Coordinators, and every
              professional who keeps delivery moving.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 22 }}>
            <p style={{ fontSize: 18.5, lineHeight: 1.7, margin: 0 }}>
              Our community starts with something simple: good coffee and real
              conversations. No stiff networking. No corporate scripts. Just project
              people meeting in real life, sharing experiences, and building
              relationships that actually matter.
            </p>

            <div>
              <p style={{ fontSize: 17.5, lineHeight: 1.7, margin: '0 0 14px', color: 'var(--ink)' }}>
                Project Connect hosts open coffee meetups where you can:
              </p>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  ['Connect', 'with peers who understand your work'],
                  ['Share', 'project stories, lessons, and insights'],
                  ['Grow', 'your career through community, mentorship, and meaningful connection.'],
                ].map(([verb, rest]) => (
                  <p key={verb} style={{
                    margin: 0, fontSize: 17.5, lineHeight: 1.6,
                    paddingLeft: 16, borderLeft: '2px solid var(--gold)',
                  }}>
                    <strong style={{ color: 'var(--gold-700)' }}>{verb}</strong>{' '}
                    <span style={{ color: 'var(--mute)' }}>{rest}</span>
                  </p>
                ))}
              </div>
            </div>

            <p style={{ fontSize: 17.5, lineHeight: 1.7, margin: 0, color: 'var(--mute)' }}>
              This isn’t another online forum or generic professional network. It’s a
              space designed for project delivery professionals who want meaningful
              connection, practical learning, and a community that feels human.
            </p>

            <p style={{
              margin: 0, paddingTop: 20, borderTop: '1px solid var(--line)',
              fontFamily: 'var(--font-heading)', fontWeight: 500,
              fontSize: 'clamp(20px,2vw,26px)', lineHeight: 1.3, letterSpacing: '-0.01em',
            }}>
              Project Connect is more than an app — it’s a movement to bring project
              people together.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
