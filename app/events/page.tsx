import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { isPaid } from '@/lib/tiers';
import { RsvpButton } from '@/components/RsvpButton';
import { EventLifecycle } from '@/components/EventLifecycle';

export const metadata = { title: 'Events — Project Connect' };

export default async function EventsPage({ searchParams }: { searchParams: { city?: string; kind?: string } }) {
  const session = await getSession();
  const supabase = createClient();
  const paid = session ? isPaid(session.subscription.tier, session.subscription.status, session.subscription.current_period_end) : false;

  let query = supabase
    .from('events')
    .select('id,title,kind,description,starts_at,seat_cap,status,status_note,original_starts_at,chapters(city),venues(name,address),event_seats(id,status,profile_id)')
    .in('status', ['published', 'postponed'])
    .gte('starts_at', new Date().toISOString())
    .order('starts_at');

  const isAdmin = session?.profile.role === 'admin';
  if (isAdmin) {
    query = supabase
      .from('events')
      .select('id,title,kind,description,starts_at,seat_cap,status,status_note,original_starts_at,chapters(city),venues(name,address),event_seats(id,status,profile_id)')
      .order('starts_at');
  }

  const { data: events } = await query;
  const city = searchParams.city;
  const kind = searchParams.kind;
  const rows = (events ?? []).filter((e: any) =>
    (!city || e.chapters?.city === city) && (!kind || e.kind === kind));

  return (
    <main className="wrap">
      <h1>Events</h1>
      <p className="mute" style={{ marginTop: 10, maxWidth: '62ch' }}>
        Matched meetups and Speaker Series talks, in one schedule. Tables run twelve to fifteen seats.
      </p>
      {isAdmin && (
        <p className="hint" style={{ marginTop: 8 }}>
          You're seeing every event, including drafts and past ones, with management controls on each.
        </p>
      )}

      <div className="row" style={{ marginTop: 22 }}>
        {[['All', ''], ['Vancouver', 'Vancouver'], ['Toronto', 'Toronto']].map(([label, value]) => (
          <a key={label} className="chip" aria-pressed={(city ?? '') === value}
            href={'/events' + (value ? '?city=' + value : '')}>{label}</a>
        ))}
        <span style={{ width: 12 }} />
        {[['Everything', ''], ['Meetups', 'meetup'], ['Speaker Series', 'talk']].map(([label, value]) => (
          <a key={label} className="chip" aria-pressed={(kind ?? '') === value}
            href={'/events' + (value ? '?kind=' + value : '')}>{label}</a>
        ))}
      </div>

      <div className="grid" style={{ marginTop: 26 }}>
        {rows.map((e: any) => {
          const confirmed = (e.event_seats ?? []).filter((s: any) => s.status === 'confirmed').length;
          const mine = session ? (e.event_seats ?? []).find((s: any) => s.profile_id === session.user.id) : null;
          const full = confirmed >= e.seat_cap;
          const locked = e.kind === 'talk' && !paid;
          const d = new Date(e.starts_at);

          return (
            <article key={e.id} className="surf" style={{ padding: 22 }}>
              <div className="row" style={{ alignItems: 'flex-start', gap: 20 }}>
                <div style={{ width: 66, height: 66, borderRadius: 14, flex: 'none', display: 'grid',
                  placeItems: 'center', background: 'linear-gradient(160deg,var(--gold-100),var(--gold-100))',
                  border: '1px solid var(--gold-200)', color: 'var(--gold-700)', fontFamily: 'var(--font-heading)' }}>
                  <span style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                    {d.toLocaleDateString('en-CA', { month: 'short' })}
                  </span>
                  <span style={{ fontSize: 23, lineHeight: 1 }}>{d.getDate()}</span>
                </div>

                <div style={{ flex: 1, minWidth: 240 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <p className="eyebrow" style={{ margin: 0 }}>
                      {e.chapters?.city} · {e.kind === 'talk' ? 'Speaker Series' : 'Meetup'}
                    </p>
                    {e.status === 'postponed' && <span className="pill pill-off">Postponed</span>}
                    {isAdmin && e.status !== 'published' && e.status !== 'postponed' && (
                      <span className="pill pill-wait">{e.status}</span>
                    )}
                    {e.status === 'published' && e.original_starts_at && (
                      <span className="pill pill-wait">New date</span>
                    )}
                  </div>
                  <h3 style={{ marginTop: 8, fontSize: 22 }}>
                    <a href={'/events/' + e.id}>{e.title}</a>
                  </h3>
                  <p className="mute small" style={{ marginTop: 6 }}>
                    {d.toLocaleString('en-CA', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                    {e.venues?.name ? ' · ' + e.venues.name : ''} · {confirmed} of {e.seat_cap} seats
                  </p>
                  {e.status_note && (
                    <p style={{
                      marginTop: 8, padding: '8px 12px', borderRadius: 10, fontSize: 14.5,
                      background: 'var(--gold-100)', border: '1px solid var(--gold-200)',
                      color: 'var(--gold-700)',
                    }}>{e.status_note}</p>
                  )}
                  {e.description && <p className="mute" style={{ marginTop: 8 }}>{e.description}</p>}
                </div>

                <div style={{ marginLeft: 'auto', display: 'grid', gap: 10, justifyItems: 'end' }}>
                  {e.status === 'postponed' ? (
                    <span className="mute small">Awaiting a new date</span>
                  ) : !session ? (
                    <a className="btn btn-gold" href="/signup">Join to RSVP</a>
                  ) : locked ? (
                    <a className="btn btn-out" href="/pricing">Paid plans only</a>
                  ) : (
                    <RsvpButton eventId={e.id} address={e.venues?.address ?? null}
                      status={mine?.status ?? null} full={full} />
                  )}

                  {isAdmin && (
                    <div style={{
                      paddingTop: 10, marginTop: 2, borderTop: '1px dashed var(--line)',
                      width: '100%', display: 'grid', justifyItems: 'end', gap: 6,
                    }}>
                      <span className="mute" style={{ fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                        Admin
                      </span>
                      <EventLifecycle eventId={e.id} title={e.title} status={e.status}
                        startsAt={e.starts_at} seatCount={(e.event_seats ?? []).length}
                        canDelete />
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        {!rows.length && <p className="mute">Nothing published for that filter yet.</p>}
      </div>
    </main>
  );
}
