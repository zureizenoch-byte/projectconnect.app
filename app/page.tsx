import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await getSession();
  if (session) redirect('/dashboard');

  const supabase = createClient();
  const { data: events } = await supabase
    .from('events')
    .select('id,title,kind,starts_at,chapters(city)')
    .eq('status', 'published')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')
    .limit(3);

  return (
    <main>
      <section className="wrap">
        <p className="eyebrow">Vancouver · Toronto</p>
        <h1 style={{ maxWidth: '20ch', marginTop: 14 }}>
          Small rooms, matched by what you actually deliver.
        </h1>
        <p className="mute" style={{ maxWidth: '58ch', fontSize: 18, marginTop: 16 }}>
          Project Connect puts PM, Product, Agile, QA, Data, Cyber, Cloud and Delivery
          professionals at tables of twelve to fifteen — organised by city chapter.
        </p>
        <div className="row" style={{ marginTop: 26 }}>
          <a className="btn btn-primary" href="/signup">Join a chapter</a>
          <a className="btn btn-out" href="/events">See events</a>
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 0 }}>
        <h2>What's next</h2>
        <div className="grid g3" style={{ marginTop: 18 }}>
          {(events ?? []).map((e: any) => (
            <a key={e.id} href={'/events/' + e.id} className="surf" style={{ padding: 22, display: 'block' }}>
              <p className="eyebrow">{e.chapters?.city} · {e.kind === 'talk' ? 'Speaker Series' : 'Meetup'}</p>
              <h3 style={{ marginTop: 10 }}>{e.title}</h3>
              <p className="mute small" style={{ marginTop: 6 }}>
                {new Date(e.starts_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </a>
          ))}
          {!events?.length && <p className="mute">No published events yet.</p>}
        </div>
      </section>
    </main>
  );
}
