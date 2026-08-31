import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { canHostTalks } from '@/lib/permissions';
import { SeatActions } from '@/components/SeatActions';
import { EventForm } from '@/components/EventForm';

export const metadata = { title: 'Speaker — Project Connect' };

export default async function SpeakerPage() {
  const { profile } = await requireSession();
  if (!canHostTalks(profile)) redirect('/profile');

  const supabase = createClient();
  const [{ data: talks }, { data: chapters }, { data: venues }] = await Promise.all([
    supabase.from('events')
      .select('id,title,status,starts_at,seat_cap,chapters(city),event_seats(id,status,table_no,profiles(full_name,role_level,intro))')
      .eq('host_id', profile.id).order('starts_at', { ascending: false }),
    supabase.from('chapters').select('id,city').eq('active', true),
    supabase.from('venues').select('id,name,chapter_id,address').eq('active', true),
  ]);

  const now = Date.now();
  const upcoming = (talks ?? []).filter((t: any) => +new Date(t.starts_at) >= now);
  const past = (talks ?? []).filter((t: any) => +new Date(t.starts_at) < now);
  const requests = upcoming.reduce((n: number, t: any) =>
    n + (t.event_seats ?? []).filter((s: any) => s.status === 'requested').length, 0);

  return (
    <main className="wrap">
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div>
          <h1>Speaker</h1>
          <p className="mute" style={{ marginTop: 10, maxWidth: '62ch' }}>
            The talks you host, who has asked for a seat, and the profile members see when they decide to come.
          </p>
        </div>
      </div>

      <div className="grid g3" style={{ marginTop: 26 }}>
        {[['Talks scheduled', upcoming.length], ['Seat requests', requests], ['Talks delivered', past.length]].map(([label, value]) => (
          <div key={String(label)} className="surf" style={{ padding: 22 }}>
            <p className="eyebrow">{label}</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 36, margin: '8px 0 0' }}>{value}</p>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 34 }}>Talks you're hosting</h2>
      <div className="grid" style={{ marginTop: 16 }}>
        {upcoming.map((t: any) => {
          const confirmed = (t.event_seats ?? []).filter((s: any) => s.status === 'confirmed').length;
          return (
            <section key={t.id} className="surf" style={{ padding: 22 }}>
              <div className="row">
                <div>
                  <p className="eyebrow">{t.chapters?.city} · {t.status}</p>
                  <h3 style={{ marginTop: 8, fontSize: 22 }}>{t.title}</h3>
                  <p className="mute small" style={{ marginTop: 6 }}>
                    {new Date(t.starts_at).toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'short' })} ·{' '}
                    {confirmed} of {t.seat_cap} seats
                  </p>
                </div>
              </div>
              <table className="table" style={{ marginTop: 16 }}>
                <thead>
                  <tr><th>Attendee</th><th>Level</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {(t.event_seats ?? []).map((s: any) => (
                    <tr key={s.id}>
                      <td>{s.profiles?.full_name ?? 'Member'}</td>
                      <td className="mute">{s.profiles?.role_level ?? '—'}</td>
                      <td><span className={'pill ' + (s.status === 'confirmed' ? 'pill-ok' : s.status === 'waitlist' ? 'pill-off' : 'pill-wait')}>{s.status}</span></td>
                      <td><SeatActions seatId={s.id} /></td>
                    </tr>
                  ))}
                  {!t.event_seats?.length && <tr><td colSpan={4} className="mute">No requests yet.</td></tr>}
                </tbody>
              </table>
            </section>
          );
        })}
        {!upcoming.length && <p className="mute">No upcoming talks. Schedule one below.</p>}
      </div>

      <h2 style={{ marginTop: 34 }}>Schedule a talk</h2>
      <EventForm kind="talk" chapters={chapters ?? []} venues={venues ?? []} />

      <h2 style={{ marginTop: 34 }}>Past talks</h2>
      <div className="surf" style={{ marginTop: 16, overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>Talk</th><th>Chapter</th><th>Attendance</th></tr></thead>
          <tbody>
            {past.map((t: any) => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td className="mute">{t.chapters?.city}</td>
                <td className="mute">
                  {(t.event_seats ?? []).filter((s: any) => s.status === 'confirmed').length} of {t.seat_cap}
                </td>
              </tr>
            ))}
            {!past.length && <tr><td colSpan={3} className="mute">Nothing delivered yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
