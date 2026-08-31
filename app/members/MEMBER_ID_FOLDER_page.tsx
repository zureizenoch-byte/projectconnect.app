import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { Avatar } from '@/components/Avatar';

export const dynamic = 'force-dynamic';

const GROUPS: [string, string][] = [
  ['domain', 'Domains'],
  ['transformation_type', 'Transformation types delivered'],
  ['method', 'Methods and frameworks'],
  ['industry', 'Industries'],
  ['certification', 'Certifications'],
  ['tool', 'Platforms and tooling'],
  ['language', 'Languages'],
];

export default async function MemberProfile({ params }: { params: { id: string } }) {
  const { profile: viewer } = await requireSession();
  const db = createAdminClient();

  const { data: person } = await db.from('profiles').select('*').eq('id', params.id).maybeSingle();
  if (!person) notFound();

  const { data: privacy } = await db.from('privacy_settings')
    .select('*').eq('profile_id', params.id).maybeSingle();

  const isSelf = viewer.id === person.id;
  const isAdmin = viewer.role === 'admin';
  const visible = privacy?.visible_to_members ?? true;

  if (!visible && !isSelf && !isAdmin) {
    return (
      <main className="wrap" style={{ maxWidth: 640 }}>
        <h1>Profile is private</h1>
        <p className="mute" style={{ marginTop: 12 }}>
          This member has chosen not to be visible to others. You'll still meet them at a matched table.
        </p>
        <a className="btn btn-out" href="/dashboard" style={{ marginTop: 20 }}>Back to dashboard</a>
      </main>
    );
  }

  const showEmployer = isSelf || isAdmin || (privacy?.show_employer ?? true);
  const showCity = isSelf || isAdmin || (privacy?.show_city ?? true);
  const allowContact = privacy?.allow_contact ?? true;

  const { data: tags } = await db.from('profile_tags')
    .select('category,value').eq('profile_id', params.id);

  const { data: posts } = await db.from('posts')
    .select('id,body,created_at').eq('author_id', params.id)
    .order('created_at', { ascending: false }).limit(5);

  const grouped = new Map<string, string[]>();
  for (const t of tags ?? []) {
    if (!grouped.has(t.category)) grouped.set(t.category, []);
    grouped.get(t.category)!.push(t.value);
  }

  const roleLabel = person.role === 'admin' ? 'Admin'
    : person.role === 'speaker' && person.speaker_approved ? 'Speaker'
    : person.role === 'chapter_lead' ? 'Chapter Lead'
    : person.role === 'student' ? 'Student' : 'Member';

  return (
    <main className="wrap" style={{ maxWidth: 900 }}>
      <a href="/dashboard" className="small mute">← Back to dashboard</a>

      <header className="surf" style={{ padding: 'clamp(24px,3.5vw,36px)', marginTop: 16 }}>
        <div className="row" style={{ gap: 22, alignItems: 'flex-start' }}>
          <Avatar src={person.photo_url} name={person.full_name} email={person.email} size={112} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="row" style={{ gap: 10 }}>
              <h1 style={{ fontSize: 'clamp(28px,3vw,38px)', margin: 0 }}>
                {person.full_name || 'Member'}
              </h1>
              {person.pronouns && <span className="mute" style={{ fontSize: 15 }}>{person.pronouns}</span>}
              <span className={'pill ' + (person.role === 'admin' ? 'pill-ok' : 'pill-wait')}>{roleLabel}</span>
            </div>
            {person.role_level && (
              <p style={{ fontSize: 17, margin: '8px 0 0' }}>
                {person.role_level}
                {showEmployer && person.employer ? ' · ' + person.employer : ''}
              </p>
            )}
            {showCity && person.city && (
              <p className="mute small" style={{ margin: '4px 0 0' }}>{person.city} chapter</p>
            )}
            {person.intro && (
              <p style={{ fontSize: 16, lineHeight: 1.65, margin: '14px 0 0', maxWidth: '60ch' }}>
                {person.intro}
              </p>
            )}
            <div className="row" style={{ gap: 10, marginTop: 18 }}>
              {isSelf && <a className="btn btn-primary" href="/profile">Edit my profile</a>}
              {!isSelf && allowContact && person.email && (
                <a className="btn btn-out" href={'mailto:' + person.email}>Get in touch</a>
              )}
              {person.linkedin_url && (
                <a className="btn btn-out" href={person.linkedin_url} target="_blank" rel="noopener noreferrer">
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {(person.open_to_mentoring || person.seeking_mentor) && (
        <div className="row" style={{ gap: 8, marginTop: 16 }}>
          {person.open_to_mentoring && <span className="tag">Open to mentoring</span>}
          {person.seeking_mentor && <span className="tag">Looking for a mentor</span>}
        </div>
      )}

      <section className="surf" style={{ padding: 'clamp(22px,3vw,32px)', marginTop: 18 }}>
        <h2 style={{ fontSize: 24 }}>Experience</h2>
        {grouped.size === 0 ? (
          <p className="mute" style={{ marginTop: 12 }}>
            {isSelf ? "You haven't mapped your experience yet." : 'Nothing mapped yet.'}
          </p>
        ) : (
          <div className="grid" style={{ gap: 20, marginTop: 18 }}>
            {GROUPS.filter(([key]) => grouped.has(key)).map(([key, label]) => (
              <div key={key}>
                <p className="eyebrow">{label}</p>
                <div className="chips" style={{ marginTop: 8 }}>
                  {grouped.get(key)!.map((v) => <span key={v} className="tag">{v}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {!!posts?.length && (
        <section className="surf" style={{ padding: 'clamp(22px,3vw,32px)', marginTop: 18 }}>
          <h2 style={{ fontSize: 24 }}>Recent posts</h2>
          <div className="grid" style={{ gap: 14, marginTop: 16 }}>
            {posts.map((p: any) => (
              <article key={p.id} style={{ borderLeft: '2px solid var(--gold-200)', paddingLeft: 14 }}>
                <p className="mute small" style={{ margin: 0 }}>
                  {new Date(p.created_at).toLocaleDateString('en-CA', { dateStyle: 'medium' })}
                </p>
                <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{p.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
