import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { isPaid } from '@/lib/tiers';
import { mapsUrl } from '@/lib/matching';
import { RsvpButton } from '@/components/RsvpButton';

export default async function EventPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  const supabase = createClient();

  const { data: e } = await supabase
    .from('events')
    .select('id,title,kind,description,starts_at,duration_min,seat_cap,status,chapters(city),venues(name,address,notes),profiles:host_id(full_name,intro)')
    .eq('id', params.id).single();
  if (!e) notFound();

  const { data: seats } = await supabase
    .from('event_seats').select('id,status,profile_id').eq('event_id', params.id);

  const confirmed = (seats ?? []).filter((s) => s.status === 'confirmed').length;
  const mine = session ? (seats ?? []).find((s) => s.profile_id === session.user.id) : null;
  const paid = session ? isPaid(session.subscription.tier, session.subscription.status, session.subscription.current_period_end) : false;
  const d = new Date(e.starts_at);
  const venue = e.venues as any;

  return (
    <main className="wrap" style={{ maxWidth: 860 }}>
      <p className="eyebrow">{(e.chapters as any)?.city} · {e.kind === 'talk' ? 'Speaker Series' : 'Meetup'}</p>
      <h1 style={{ marginTop: 12 }}>{e.title}</h1>
      <p className="mute" style={{ marginTop: 12, fontSize: 17 }}>
        {d.toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'short' })} · {e.duration_min} minutes
      </p>

      <div className="surf" style={{ padding: 24, marginTop: 24 }}>
        {e.description && <p style={{ marginTop: 0 }}>{e.description}</p>}
        <dl className="grid g2" style={{ marginTop: 8 }}>
          <div>
            <dt className="eyebrow">Venue</dt>
            <dd style={{ margin: '6px 0 0' }}>
              {venue?.name ?? 'To be confirmed'}
              {venue?.address && <><br /><span className="mute small">{venue.address}</span></>}
              {venue?.notes && <><br /><span className="mute small">{venue.notes}</span></>}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Seats</dt>
            <dd style={{ margin: '6px 0 0' }}>{confirmed} confirmed of {e.seat_cap}</dd>
          </div>
          {(e.profiles as any)?.full_name && (
            <div>
              <dt className="eyebrow">Host</dt>
              <dd style={{ margin: '6px 0 0' }}>
                {(e.profiles as any).full_name}
                <br /><span className="mute small">{(e.profiles as any).intro}</span>
              </dd>
            </div>
          )}
        </dl>

        <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          {!session ? (
            <a className="btn btn-gold" href="/signup">Join to RSVP</a>
          ) : e.kind === 'talk' && !paid ? (
            <div>
              <a className="btn btn-out" href="/pricing">Speaker Series needs a paid plan</a>
              <p className="hint">Free membership covers one meetup per cycle.</p>
            </div>
          ) : (
            <RsvpButton eventId={e.id} address={venue?.address ?? null}
              status={mine?.status ?? null} full={confirmed >= e.seat_cap} />
          )}
          {venue?.address && (
            <>
              <div style={{
                marginTop: 20, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)',
              }}>
                <iframe
                  title="Venue location"
                  width="100%" height="260" loading="lazy" style={{ border: 0, display: 'block' }}
                  referrerPolicy="no-referrer-when-downgrade"
                  src={
                    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                      ? 'https://www.google.com/maps/embed/v1/place?key='
                        + process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                        + '&q=' + encodeURIComponent(venue.address) + '&zoom=16'
                      : 'https://www.google.com/maps?q=' + encodeURIComponent(venue.address) + '&output=embed'
                  } />
                <div className="row" style={{
                  justifyContent: 'space-between', padding: '12px 16px', background: '#fcfcff',
                }}>
                  <span className="mute small">{venue.address}</span>
                  <a className="btn btn-out" target="_blank" rel="noopener noreferrer"
                    href={mapsUrl(venue.address)}
                    style={{ minHeight: 34, padding: '0 14px', fontSize: 13.5 }}>Directions</a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
