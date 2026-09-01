import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isPaid } from '@/lib/tiers';
import { mapsUrl } from '@/lib/matching';
import { RsvpButton } from '@/components/RsvpButton';
import { MatchAttendeesButton } from '@/components/MatchAttendeesButton';
import { Avatar } from '@/components/Avatar';
import { LiveSeats } from '@/components/LiveSeats';
import { describeMix } from '@/lib/matching';

export const dynamic = 'force-dynamic';

export default async function EventPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  const supabase = createClient();

  const { data: e } = await supabase
    .from('events')
    .select('id,title,kind,description,starts_at,duration_min,seat_cap,status,status_note,original_starts_at,host_id,created_by,chapter_id,chapters(city),venues(name,address,notes),profiles:host_id(full_name,intro)')
    .eq('id', params.id).single();
  if (!e) notFound();

  const { data: seats } = await supabase
    .from('event_seats').select('id,status,profile_id,table_no,created_at')
    .eq('event_id', params.id).order('created_at');

  const attendeeIds = (seats ?? [])
    .filter((s) => s.status === 'confirmed' || s.status === 'waitlist')
    .map((s) => s.profile_id);

  const db = createAdminClient();

  const [{ data: people }, { data: domainTags }] = await Promise.all([
    attendeeIds.length
      ? db.from('profiles')
          .select('id,full_name,photo_url,role_level,city,employer,role,speaker_approved')
          .in('id', attendeeIds)
      : Promise.resolve({ data: [] as any[] }),
    attendeeIds.length
      ? db.from('profile_tags')
          .select('profile_id,value').eq('category', 'domain').in('profile_id', attendeeIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const personById = new Map((people ?? []).map((x: any) => [x.id, x]));

  // The host may predate having a seat, so fetch them regardless
  const hostId = e.host_id ?? e.created_by;
  if (hostId && !personById.has(hostId)) {
    const { data: host } = await db.from('profiles')
      .select('id,full_name,photo_url,role_level,city,employer,role,speaker_approved')
      .eq('id', hostId).maybeSingle();
    if (host) personById.set(host.id, host);
  }
  const domainsOf = new Map<string, string[]>();
  for (const t of domainTags ?? []) {
    if (!domainsOf.has(t.profile_id)) domainsOf.set(t.profile_id, []);
    domainsOf.get(t.profile_id)!.push(t.value);
  }

  const going = (seats ?? []).filter((s) => s.status === 'confirmed');
  const waitlist = (seats ?? []).filter((s) => s.status === 'waitlist');

  const mixDomains = [...new Set(going.flatMap((s) => domainsOf.get(s.profile_id) ?? []))];
  const mixLevels = [...new Set(going
    .map((s) => personById.get(s.profile_id)?.role_level)
    .filter(Boolean))] as string[];

  const canSeat = !!session && (
    session.profile.role === 'admin'
    || e.host_id === session.user.id
    || e.created_by === session.user.id
    || (session.profile.lead_chapter_id && session.profile.lead_chapter_id === e.chapter_id)
  );


  const confirmed = (seats ?? []).filter((s) => s.status === 'confirmed').length;
  const mine = session ? (seats ?? []).find((s) => s.profile_id === session.user.id) : null;
  const paid = session ? isPaid(session.subscription.tier, session.subscription.status, session.subscription.current_period_end) : false;
  const d = new Date(e.starts_at);
  const venue = e.venues as any;
  const city = (e.chapters as any)?.city;

  // A full address geocodes far better than a bare street line
  const mapQuery = venue?.address
    ? (venue.address.toLowerCase().includes(String(city ?? '').toLowerCase())
        ? venue.address
        : venue.address + ', ' + city)
    : null;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const finalSrc = mapQuery
    ? (key
        ? 'https://www.google.com/maps/embed/v1/place?key=' + key
            + '&q=' + encodeURIComponent(mapQuery) + '&zoom=16'
        : 'https://maps.google.com/maps?q=' + encodeURIComponent(mapQuery)
            + '&z=16&hl=en&output=embed')
    : null;

  return (
    <main className="wrap" style={{ maxWidth: 860 }}>
      <LiveSeats eventId={e.id} />
      <p className="eyebrow">{city} · {e.kind === 'talk' ? 'Speaker Series' : 'Meetup'}</p>
      <h1 style={{ marginTop: 12 }}>{e.title}</h1>
      <p className="mute" style={{ marginTop: 12, fontSize: 17 }}>
        {d.toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'short' })} · {e.duration_min} minutes
      </p>

      {(e.status === 'postponed' || e.status === 'cancelled' || e.original_starts_at) && (
        <div style={{
          marginTop: 16, padding: '16px 20px', borderRadius: 14,
          border: '1px solid ' + (e.status === 'cancelled' ? 'rgba(180,35,24,.3)' : 'var(--gold-200)'),
          background: e.status === 'cancelled' ? '#fff6f5' : 'var(--gold-100)',
        }}>
          <strong style={{ color: e.status === 'cancelled' ? 'var(--err)' : 'var(--gold-700)' }}>
            {e.status === 'cancelled' ? 'This event was cancelled'
              : e.status === 'postponed' ? 'Postponed — a new date is coming'
                : 'This event was moved'}
          </strong>
          {e.original_starts_at && e.status !== 'cancelled' && (
            <p className="mute" style={{ margin: '6px 0 0', fontSize: 14.5 }}>
              Originally {new Date(e.original_starts_at).toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'short' })}
            </p>
          )}
          {e.status_note && (
            <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.6 }}>{e.status_note}</p>
          )}
        </div>
      )}

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
          {(personById.get(hostId ?? '')?.full_name || (e.profiles as any)?.full_name) && (
            <div>
              <dt className="eyebrow">Host</dt>
              <dd style={{ margin: '8px 0 0' }}>
                <a href={'/members/' + hostId}
                  style={{
                    display: 'inline-flex', gap: 12, alignItems: 'center',
                    textDecoration: 'none', color: 'inherit',
                  }}>
                  <Avatar src={personById.get(hostId ?? '')?.photo_url}
                    name={personById.get(hostId ?? '')?.full_name ?? (e.profiles as any)?.full_name}
                    size={52} />
                  <span>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: 16.5 }}>
                      {personById.get(hostId ?? '')?.full_name ?? (e.profiles as any)?.full_name}
                    </span>
                    <span className="mute small">
                      {[personById.get(hostId ?? '')?.role_level, (e.profiles as any)?.intro]
                        .filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </a>
              </dd>
            </div>
          )}
        </dl>

        {canSeat && going.length > 15 && (
          <div style={{
            marginTop: 20, padding: '16px 18px', borderRadius: 14,
            background: 'var(--gold-100)', border: '1px solid var(--gold-200)',
          }}>
            <p className="eyebrow" style={{ margin: 0 }}>Tables</p>
            <p className="mute small" style={{ margin: '6px 0 12px' }}>
              {going.length} people is more than one table. Split them into tables that spread
              domains and role levels, so nobody sits with only their own discipline.
            </p>
            <MatchAttendeesButton eventId={e.id} requestCount={going.length} seatCap={e.seat_cap} />
          </div>
        )}

        <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          {!session ? (
            <a className="btn btn-gold" href="/signup">Join to RSVP</a>
          ) : e.status === 'postponed' ? (
            <p className="mute" style={{ margin: 0 }}>Awaiting a new date — your seat is held.</p>
          ) : e.status === 'cancelled' ? (
            <p className="mute" style={{ margin: 0 }}>This event is off.</p>
          ) : e.kind === 'talk' && !paid ? (
            <div>
              <a className="btn btn-out" href="/pricing">Speaker Series needs a paid plan</a>
              <p className="hint">Free membership covers one meetup per cycle.</p>
            </div>
          ) : (
            <RsvpButton eventId={e.id} address={mapQuery}
              status={mine?.status ?? null} full={confirmed >= e.seat_cap} />
          )}
        </div>
      </div>

      <section className="surf" style={{ padding: 'clamp(22px,3vw,30px)', marginTop: 18 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ fontSize: 26 }}>Who's coming</h2>
            {going.length > 0 && (
              <p className="mute small" style={{ margin: '6px 0 0' }}>
                {describeMix(mixDomains, mixLevels)}
              </p>
            )}
          </div>
          <span className="mute small">{going.length} of {e.seat_cap}</span>
        </div>

        {going.length === 0 ? (
          <p className="mute" style={{ marginTop: 16 }}>
            Nobody yet. Take the first seat and others will be matched around you.
          </p>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 12, marginTop: 20,
          }}>
            {going.map((s) => {
              const person = personById.get(s.profile_id);
              const domains = (domainsOf.get(s.profile_id) ?? []).slice(0, 2);
              return (
                <a key={s.id} href={'/members/' + s.profile_id}
                  style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    padding: 14, borderRadius: 14, border: '1px solid var(--line)',
                    textDecoration: 'none', color: 'inherit', background: '#fff',
                  }}>
                  <Avatar src={person?.photo_url} name={person?.full_name} size={52} />
                  <div style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: 16 }}>
                      {person?.full_name ?? 'Member'}
                      {s.profile_id === hostId && (
                        <span className="pill pill-wait" style={{ marginLeft: 6, fontSize: 10 }}>Host</span>
                      )}
                      {person?.speaker_approved && s.profile_id !== hostId && (
                        <span className="pill pill-wait" style={{ marginLeft: 6, fontSize: 10 }}>Speaker</span>
                      )}
                    </span>
                    {person?.role_level && (
                      <span className="mute small" style={{ display: 'block', marginTop: 2 }}>
                        {person.role_level}
                      </span>
                    )}
                    {domains.length > 0 && (
                      <span className="mute small" style={{ display: 'block', marginTop: 4 }}>
                        {domains.join(' · ')}
                      </span>
                    )}
                    {s.table_no && (
                      <span className="mute small" style={{ display: 'block', marginTop: 4 }}>
                        Table {s.table_no}
                      </span>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {waitlist.length > 0 && (
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
            <p className="eyebrow" style={{ margin: 0 }}>Waitlist · {waitlist.length}</p>
            <p className="mute small" style={{ margin: '6px 0 12px' }}>
              Promoted automatically, in order, whenever someone cancels.
            </p>
            <div className="row" style={{ gap: 10 }}>
              {waitlist.map((s, i) => {
                const person = personById.get(s.profile_id);
                return (
                  <a key={s.id} href={'/members/' + s.profile_id}
                    title={(person?.full_name ?? 'Member') + ' — position ' + (i + 1)}
                    style={{ display: 'flex', gap: 8, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                    <Avatar src={person?.photo_url} name={person?.full_name} size={34} />
                    <span className="small">{person?.full_name ?? 'Member'}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {mapQuery && (
        <section className="surf" style={{ marginTop: 18, overflow: 'hidden' }}>
          <header className="row" style={{
            justifyContent: 'space-between', padding: '16px 20px',
            borderBottom: '1px solid var(--line)',
          }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Getting there</p>
              <p style={{ margin: '4px 0 0', fontSize: 16 }}>{venue?.name}</p>
              <p className="mute small" style={{ margin: '2px 0 0' }}>{mapQuery}</p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <a className="btn btn-out" target="_blank" rel="noopener noreferrer"
                href={'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(mapQuery!)}
                style={{ minHeight: 40, padding: '0 16px', fontSize: 14 }}>Directions</a>
              <a className="btn btn-gold" target="_blank" rel="noopener noreferrer"
                href={mapsUrl(mapQuery!)}
                style={{ minHeight: 40, padding: '0 16px', fontSize: 14 }}>Open in Maps</a>
            </div>
          </header>
          {finalSrc ? (
            <iframe
              title={'Map of ' + (venue?.name ?? 'the venue')}
              src={finalSrc}
              width="100%" height="340" loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ border: 0, display: 'block' }} />
          ) : (
            <div style={{
              padding: 28, textAlign: 'center', background: 'var(--gold-100)',
            }}>
              <p className="mute" style={{ margin: 0 }}>
                Map preview unavailable — use Directions above to open it in Maps.
              </p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
