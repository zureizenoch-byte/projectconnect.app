import { requireSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { canRunChapter, canHostTalks } from '@/lib/permissions';
import { isPaid } from '@/lib/tiers';
import { EventForm } from '@/components/EventForm';

export const metadata = { title: 'Propose an event — Project Connect' };

export default async function NewEventPage({ searchParams }: { searchParams: { kind?: string } }) {
  const { profile, subscription } = await requireSession();
  const supabase = createClient();
  const paid = isPaid(subscription.tier, subscription.status, subscription.current_period_end);

  const [{ data: chapters }, { data: venues }] = await Promise.all([
    supabase.from('chapters').select('id,city').eq('active', true),
    supabase.from('venues').select('id,name,chapter_id,address').eq('active', true),
  ]);

  const canTalk = canHostTalks(profile);
  const organiser = canRunChapter(profile);

  // How many meetups this person has already scheduled this cycle
  const cycleStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const { count: hostedThisCycle } = await supabase.from('events')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', profile.id)
    .neq('status', 'cancelled')
    .gte('starts_at', cycleStart.toISOString());

  const limited = !paid && !organiser && profile.role !== 'admin';
  const atLimit = limited && (hostedThisCycle ?? 0) >= 1;
  const kind = searchParams.kind === 'talk' && canTalk ? 'talk' : 'meetup';

  return (
    <main className="wrap" style={{ maxWidth: 860 }}>
      <a href="/events" className="small mute">← Back to events</a>
      <h1 style={{ marginTop: 14 }}>
        {kind === 'talk' ? 'Schedule a Speaker Series talk' : 'Propose a coffee meetup'}
      </h1>
      <p className="mute" style={{ marginTop: 12, maxWidth: '62ch', fontSize: 17 }}>
        {kind === 'talk'
          ? 'Your talk goes to an admin for approval, then appears in the chapter schedule for members to request a seat.'
          : 'Pick a coffee shop, a time, and how many people you want around the table. An admin checks it, then it appears in Events for your chapter to join.'}
      </p>

      {canTalk && (
        <div className="row" style={{ gap: 8, marginTop: 20 }}>
          <a className="chip" aria-pressed={kind === 'meetup'} href="/events/new">Coffee meetup</a>
          <a className="chip" aria-pressed={kind === 'talk'} href="/events/new?kind=talk">Speaker Series talk</a>
        </div>
      )}

      {limited && (
        <div className="surf" style={{
          padding: 18, marginTop: 20,
          background: atLimit ? '#fff6f5' : 'var(--gold-100)',
          borderColor: atLimit ? 'rgba(180,35,24,.3)' : 'var(--gold-200)',
        }}>
          <strong style={{ color: atLimit ? 'var(--err)' : 'var(--gold-700)' }}>
            {atLimit
              ? 'You have already scheduled a meetup this cycle'
              : 'Free membership covers one meetup a cycle'}
          </strong>
          <p className="mute small" style={{ margin: '6px 0 0' }}>
            {atLimit
              ? 'Upgrade to schedule more, or wait until next month. You can still join other people\u2019s meetups.'
              : 'Schedule as many as you like on a paid plan.'}
          </p>
          {atLimit && (
            <a className="btn btn-gold" href="/pricing"
              style={{ marginTop: 12, minHeight: 40, padding: '0 16px', fontSize: 14 }}>
              See plans
            </a>
          )}
        </div>
      )}

      {atLimit ? null : <EventForm
        kind={kind}
        chapters={chapters ?? []}
        venues={venues ?? []}
        minSeats={kind === 'talk' || organiser ? 12 : 2}
        defaultSeats={kind === 'talk' || organiser ? 15 : 6}
        submitLabel={kind === 'talk' ? 'Submit talk' : 'Propose meetup'}
      />}

      <div className="surf" style={{ padding: 22, marginTop: 20 }}>
        <p className="eyebrow">What happens next</p>
        <ol className="mute" style={{ margin: '10px 0 0', paddingLeft: 20, fontSize: 15, lineHeight: 1.8 }}>
          <li>An admin reviews it — usually the same day.</li>
          <li>Once approved it publishes to Events, and your chapter is notified.</li>
          <li>You'll get a notification either way, and can see its status on this page.</li>
        </ol>
      </div>
    </main>
  );
}
