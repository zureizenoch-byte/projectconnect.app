import { requireSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { canRunChapter, canHostTalks } from '@/lib/permissions';
import { EventForm } from '@/components/EventForm';

export const metadata = { title: 'Schedule an event — Project Connect' };

export default async function NewEventPage({ searchParams }: { searchParams: { kind?: string } }) {
  const { profile } = await requireSession();
  const supabase = createClient();

  const [{ data: chapters }, { data: venues }] = await Promise.all([
    supabase.from('chapters').select('id,city').eq('active', true),
    supabase.from('venues').select('id,name,chapter_id,address').eq('active', true),
  ]);

  const canTalk = canHostTalks(profile);
  const organiser = canRunChapter(profile);

  // Meetups are convened by Chapter Leads; talks by approved Speakers.
  const kind = searchParams.kind === 'talk'
    ? 'talk'
    : organiser ? 'meetup' : (canTalk ? 'talk' : 'meetup');

  const allowed = kind === 'talk' ? canTalk : organiser;

  if (!allowed) {
    return (
      <main className="wrap" style={{ maxWidth: 620 }}>
        <a href="/events" className="small mute">← Back to events</a>
        <h1 style={{ marginTop: 14 }}>Meetups are run by Chapter Leads</h1>
        <p className="mute" style={{ marginTop: 12, fontSize: 17, lineHeight: 1.65 }}>
          Your Chapter Lead sets the calendar so tables stay balanced and venues aren't
          double-booked. Take a seat at one, and tell your lead if there's a meetup you'd
          like to see.
        </p>
        <div className="row" style={{ gap: 10, marginTop: 22 }}>
          <a className="btn btn-gold" href="/events">Browse events</a>
          <a className="btn btn-out" href="/profile">Apply to lead a chapter</a>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap" style={{ maxWidth: 860 }}>
      <a href="/events" className="small mute">← Back to events</a>
      <h1 style={{ marginTop: 14 }}>
        {kind === 'talk' ? 'Schedule a Speaker Series talk' : 'Schedule a coffee meetup'}
      </h1>
      <p className="mute" style={{ marginTop: 12, maxWidth: '62ch', fontSize: 17 }}>
        {kind === 'talk'
          ? 'Your talk goes to an admin for approval, then appears in the chapter schedule for members to take a seat.'
          : 'Pick a coffee shop, a time, and how many seats. An admin checks it, then it appears in Events for your chapter to join.'}
      </p>

      {canTalk && organiser && (
        <div className="row" style={{ gap: 8, marginTop: 20 }}>
          <a className="chip" aria-pressed={kind === 'meetup'} href="/events/new">Coffee meetup</a>
          <a className="chip" aria-pressed={kind === 'talk'} href="/events/new?kind=talk">Speaker Series talk</a>
        </div>
      )}

      <EventForm
        kind={kind}
        chapters={chapters ?? []}
        venues={venues ?? []}
        minSeats={12}
        defaultSeats={15}
        submitLabel={kind === 'talk' ? 'Submit talk' : 'Create meetup'}
      />

      <div className="surf" style={{ padding: 22, marginTop: 20 }}>
        <p className="eyebrow">What happens next</p>
        <ol className="mute" style={{ margin: '10px 0 0', paddingLeft: 20, fontSize: 15, lineHeight: 1.8 }}>
          <li>An admin reviews it — usually the same day.</li>
          <li>Once approved it publishes to Events, and your chapter is notified.</li>
          <li>You'll get a notification either way.</li>
        </ol>
      </div>
    </main>
  );
}
