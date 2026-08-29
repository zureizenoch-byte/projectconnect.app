import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { canRunChapter } from '@/lib/permissions';
import { SeatActions } from '@/components/SeatActions';
import { EventForm } from '@/components/EventForm';
import { MatchButton } from './MatchButton';

export const metadata = { title: 'Chapter — Project Connect' };

export default async function ChapterPage() {
  const { profile } = await requireSession();
  if (!canRunChapter(profile)) redirect('/dashboard');

  const supabase = createClient();
  const chapterId = profile.lead_chapter_id ?? profile.chapter_id;

  const [{ data: events }, { data: chapters }, { data: venues }, { data: members }] = await Promise.all([
    supabase.from('events')
      .select('id,title,kind,status,starts_at,seat_cap,venues(name,address),event_seats(id,status,table_no,checked_in,profiles(full_name,role_level))')
      .eq('chapter_id', chapterId ?? '').order('starts_at'),
    supabase.from('chapters').select('id,city').eq('active', true),
    supabase.from('venues').select('id,name,chapter_id').eq('active', true),
    supabase.from('profiles').select('id').eq('chapter_id', chapterId ?? ''),
  ]);

  const now = Date.now();
  const upcoming = (events ?? []).filter((e: any) => +new Date(e.starts_at) >= now);

  return (
    <main className="wrap">
      <h1>Chapter</h1>
      <p className="mute" style={{ marginTop: 10, maxWidth: '62ch' }}>
        Your calendar, seating and check-in. Auto-matching gives a first pass by domain and role level — override any table number.
      </p>

      <div className="grid g3" style={{ marginTop: 26 }}>
        {[
          ['Members', members?.length ?? 0],
          ['Upcoming events', upcoming.length],
          ['Seats to review', upcoming.reduce((n: number, e: any) =>
            n + (e.event_seats ?? []).filter((s: any) => s.status === 'requested').length, 0)],
        ].map(([label, value]) => (
          <div key={String(label)} className="surf" style={{ padding: 22 }}>
            <p className="eyebrow">{label}</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 36, margin: '8px 0 0' }}>{value}</p>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 34 }}>Upcoming events</h2>
      <div className="grid" style={{ marginTop: 16 }}>
        {upcoming.map((e: any) => (
          <section key={e.id} className="surf" style={{ padding: 22 }}>
            <div className="row">
              <div>
                <p className="eyebrow">{e.kind === 'talk' ? 'Speaker Series' : 'Meetup'} · {e.status}</p>
                <h3 style={{ marginTop: 8, fontSize: 22 }}>{e.title}</h3>
                <p className="mute small" style={{ marginTop: 6 }}>
                  {new Date(e.starts_at).toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'short' })}
                  {e.venues?.name ? ' · ' + e.venues.name : ''} · cap {e.seat_cap}
                </p>
              </div>
              <div style={{ marginLeft: 'auto' }}><MatchButton eventId={e.id} /></div>
            </div>
            <table className="table" style={{ marginTop: 16 }}>
              <thead><tr><th>Attendee</th><th>Level</th><th>Status</th><th style={{ textAlign: 'right' }}>Table / actions</th></tr></thead>
              <tbody>
                {(e.event_seats ?? []).map((s: any) => (
                  <tr key={s.id}>
                    <td>{s.profiles?.full_name ?? 'Member'}</td>
                    <td className="mute">{s.profiles?.role_level ?? '—'}</td>
                    <td><span className={'pill ' + (s.status === 'confirmed' ? 'pill-ok' : s.status === 'waitlist' ? 'pill-off' : 'pill-wait')}>{s.status}</span></td>
                    <td><SeatActions seatId={s.id} showTable tableNo={s.table_no} /></td>
                  </tr>
                ))}
                {!e.event_seats?.length && <tr><td colSpan={4} className="mute">No RSVPs yet.</td></tr>}
              </tbody>
            </table>
          </section>
        ))}
        {!upcoming.length && <p className="mute">Nothing scheduled. Create a meetup below.</p>}
      </div>

      <h2 style={{ marginTop: 34 }}>Create a meetup</h2>
      <EventForm kind="meetup" chapters={chapters ?? []} venues={venues ?? []} />
    </main>
  );
}
