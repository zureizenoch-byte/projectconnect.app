import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { canRunChapter, leadNeedsPlan } from '@/lib/permissions';
import { isPaid } from '@/lib/tiers';
import { EventForm } from '@/components/EventForm';
import { EventLifecycle } from '@/components/EventLifecycle';
import { Avatar } from '@/components/Avatar';
import { MatchButton } from './MatchButton';
import { SeatRow } from './SeatRow';

export const metadata = { title: 'Chapter — Project Connect' };
export const dynamic = 'force-dynamic';

const EVENT_COLS = 'id,title,kind,status,starts_at,seat_cap,status_note,host_id,created_by,'
  + 'venues(name,address),'
  + 'event_seats(id,status,table_no,checked_in,profile_id,profiles(full_name,role_level))';

export default async function ChapterPage() {
  const { profile, subscription } = await requireSession();
  if (!canRunChapter(profile)) redirect('/dashboard');

  const paid = isPaid(subscription.tier, subscription.status, subscription.current_period_end);
  const needsPlan = leadNeedsPlan(profile, paid);

  // The lead needs to see everyone in their chapter, which RLS scopes away.
  const db = createAdminClient();
  const chapterId = profile.lead_chapter_id ?? profile.chapter_id;

  const [{ data: chapter }, { data: events }, { data: chapters }, { data: venues }, { data: roster }] =
    await Promise.all([
      db.from('chapters').select('id,city,name').eq('id', chapterId ?? '').maybeSingle(),
      db.from('events').select(EVENT_COLS).eq('chapter_id', chapterId ?? '').order('starts_at'),
      db.from('chapters').select('id,city').eq('active', true),
      db.from('venues').select('id,name,chapter_id,address,capacity,active')
        .eq('chapter_id', chapterId ?? '').order('name'),
      db.from('profiles')
        .select('id,full_name,photo_url,role_level,role,speaker_approved,created_at')
        .eq('chapter_id', chapterId ?? '').order('created_at', { ascending: false }),
    ]);

  const now = Date.now();
  const all = events ?? [];
  const upcoming = all.filter((e: any) =>
    +new Date(e.starts_at) >= now || e.status === 'postponed');
  const past = all
    .filter((e: any) => +new Date(e.starts_at) < now && e.status !== 'postponed')
    .reverse();
  const pending = all.filter((e: any) => e.status === 'pending' || e.status === 'draft');

  const seatsOf = (e: any) => (e.event_seats ?? []);
  const confirmedOf = (e: any) => seatsOf(e).filter((s: any) => s.status === 'confirmed');

  const seatsThisCycle = upcoming.reduce((n: number, e: any) => n + confirmedOf(e).length, 0);
  const waitlisted = upcoming.reduce((n: number, e: any) =>
    n + seatsOf(e).filter((s: any) => s.status === 'waitlist').length, 0);

  // Show rate is the only number that tells a lead whether the chapter is real
  const pastConfirmed = past.reduce((n: number, e: any) => n + confirmedOf(e).length, 0);
  const pastAttended = past.reduce((n: number, e: any) =>
    n + confirmedOf(e).filter((s: any) => s.checked_in).length, 0);
  const showRate = pastConfirmed > 0
    ? Math.round((pastAttended / pastConfirmed) * 100) + '%'
    : '—';

  const stats: [string, string | number, string][] = [
    ['Members', roster?.length ?? 0, 'in ' + (chapter?.city ?? 'your chapter')],
    ['Upcoming events', upcoming.length, pending.length ? pending.length + ' awaiting approval' : 'all published'],
    ['Seats taken', seatsThisCycle, waitlisted ? waitlisted + ' on waitlists' : 'no waitlists'],
    ['Show rate', showRate, pastConfirmed ? 'across ' + past.length + ' past events' : 'no history yet'],
  ];

  return (
    <main className="wrap">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p className="eyebrow">{chapter?.city ?? 'Chapter'} chapter</p>
          <h1 style={{ marginTop: 10 }}>Chapter Lead</h1>
          <p className="mute" style={{ marginTop: 10, maxWidth: '62ch' }}>
            Your calendar, seating and door. Grouping gives a first pass by domain and role
            level — override any table number.
          </p>
        </div>
      </div>

      {needsPlan && (
        <div className="surf" style={{
          padding: 18, marginTop: 22,
          background: 'var(--gold-100)', borderColor: 'var(--gold-200)',
        }}>
          <strong style={{ color: 'var(--gold-700)' }}>Your plan has lapsed</strong>
          <p className="mute small" style={{ margin: '6px 0 0', maxWidth: '58ch' }}>
            Chapter Lead access assumes an active paid plan. Your tools still work, but renew
            so your own seat limits do not get in the way of running rooms.
          </p>
          <a className="btn btn-gold" href="/pricing"
            style={{ marginTop: 12, minHeight: 40, padding: '0 16px', fontSize: 14 }}>See plans</a>
        </div>
      )}

      <div className="grid g3" style={{ marginTop: 26 }}>
        {stats.map(([label, value, note]) => (
          <div key={label} className="surf" style={{ padding: 22 }}>
            <p className="eyebrow">{label}</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 36, margin: '8px 0 0' }}>{value}</p>
            <p className="mute small" style={{ margin: '2px 0 0' }}>{note}</p>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 34 }}>Create a meetup</h2>
      <EventForm kind="meetup" chapters={chapters ?? []} venues={venues ?? []} />

      <h2 style={{ marginTop: 34 }}>Upcoming events</h2>
      <div className="grid" style={{ marginTop: 16 }}>
        {upcoming.map((e: any) => {
          const seats = seatsOf(e);
          const confirmed = confirmedOf(e).length;
          const checkedIn = confirmedOf(e).filter((s: any) => s.checked_in).length;

          return (
            <section key={e.id} className="surf" style={{ padding: 22 }}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <p className="eyebrow">
                    {e.kind === 'talk' ? 'Speaker Series' : 'Meetup'} · {e.status}
                  </p>
                  <h3 style={{ marginTop: 8, fontSize: 22 }}>
                    <a href={'/events/' + e.id} style={{ color: 'var(--ink)' }}>{e.title}</a>
                  </h3>
                  <p className="mute small" style={{ marginTop: 6 }}>
                    {new Date(e.starts_at).toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'short' })}
                    {e.venues?.name ? ' · ' + e.venues.name : ' · venue to be confirmed'}
                  </p>
                  <p className="mute small" style={{ marginTop: 2 }}>
                    {confirmed} of {e.seat_cap} seats{checkedIn ? ' · ' + checkedIn + ' checked in' : ''}
                  </p>
                  {e.status_note && (
                    <p className="mute small" style={{ margin: '6px 0 0', fontStyle: 'italic' }}>
                      {e.status_note}
                    </p>
                  )}
                </div>
                <div style={{ display: 'grid', gap: 10, justifyItems: 'end' }}>
                  {confirmed > 15 && <MatchButton eventId={e.id} />}
                  <EventLifecycle eventId={e.id} title={e.title} status={e.status}
                    startsAt={e.starts_at} seatCount={seats.length}
                    canDelete={profile.role === 'admin'} />
                </div>
              </div>

              <table className="table" style={{ marginTop: 16 }}>
                <thead>
                  <tr>
                    <th>Attendee</th><th>Level</th><th>Status</th>
                    <th style={{ textAlign: 'right' }}>Table · door</th>
                  </tr>
                </thead>
                <tbody>
                  {seats.map((s: any) => <SeatRow key={s.id} seat={s} past={false} />)}
                  {!seats.length && (
                    <tr><td colSpan={4} className="mute">No RSVPs yet.</td></tr>
                  )}
                </tbody>
              </table>
            </section>
          );
        })}
        {!upcoming.length && (
          <p className="mute">Nothing scheduled. Create a meetup above.</p>
        )}
      </div>

      <h2 style={{ marginTop: 34 }}>Chapter venues</h2>
      <div className="surf" style={{ marginTop: 16, overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>Venue</th><th>Address</th><th>Capacity</th><th>Status</th></tr></thead>
          <tbody>
            {(venues ?? []).map((v: any) => (
              <tr key={v.id}>
                <td>{v.name}</td>
                <td className="mute small">{v.address}</td>
                <td className="mute">{v.capacity}</td>
                <td>
                  {v.active
                    ? <span className="pill pill-ok">Active</span>
                    : <span className="pill pill-off">Retired</span>}
                </td>
              </tr>
            ))}
            {!venues?.length && (
              <tr><td colSpan={4} className="mute">
                No venues yet — an admin adds them, or pick a place when creating a meetup.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 34 }}>Members</h2>
      <p className="mute small" style={{ marginTop: 6 }}>
        Everyone in {chapter?.city ?? 'your chapter'}, newest first.
      </p>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 12, marginTop: 16,
      }}>
        {(roster ?? []).map((m: any) => (
          <a key={m.id} href={'/members/' + m.id}
            className="surf lift"
            style={{
              display: 'flex', gap: 12, alignItems: 'center', padding: 14,
              textDecoration: 'none', color: 'inherit',
            }}>
            <Avatar src={m.photo_url} name={m.full_name} size={46} />
            <div style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: 15.5 }}>
                {m.full_name ?? 'Member'}
              </span>
              <span className="mute small" style={{ display: 'block' }}>
                {m.role_level ?? (m.role === 'student' ? 'Student' : 'Member')}
              </span>
              {m.speaker_approved && (
                <span className="pill pill-wait" style={{ marginTop: 4, fontSize: 10 }}>Speaker</span>
              )}
            </div>
          </a>
        ))}
        {!roster?.length && <p className="mute">Nobody has joined this chapter yet.</p>}
      </div>

      <h2 style={{ marginTop: 34 }}>Past events</h2>
      <p className="mute small" style={{ marginTop: 6 }}>
        Mark who actually turned up — it is what the show rate above is built from.
      </p>
      <div className="grid" style={{ marginTop: 16 }}>
        {past.slice(0, 8).map((e: any) => {
          const confirmed = confirmedOf(e);
          const attended = confirmed.filter((s: any) => s.checked_in).length;
          return (
            <section key={e.id} className="surf" style={{ padding: 22 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <p className="eyebrow">
                    {e.kind === 'talk' ? 'Speaker Series' : 'Meetup'} ·{' '}
                    {new Date(e.starts_at).toLocaleDateString('en-CA', { dateStyle: 'medium' })}
                  </p>
                  <h3 style={{ marginTop: 8, fontSize: 20 }}>{e.title}</h3>
                </div>
                <span className="mute small">{attended} of {confirmed.length} attended</span>
              </div>
              {confirmed.length > 0 && (
                <table className="table" style={{ marginTop: 14 }}>
                  <thead>
                    <tr>
                      <th>Attendee</th><th>Level</th><th>Status</th>
                      <th style={{ textAlign: 'right' }}>Table · attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {confirmed.map((s: any) => <SeatRow key={s.id} seat={s} past />)}
                  </tbody>
                </table>
              )}
            </section>
          );
        })}
        {!past.length && <p className="mute">No events have run yet.</p>}
      </div>
    </main>
  );
}
