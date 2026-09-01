import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { Avatar } from '@/components/Avatar';
import { MessageButton } from '@/components/MessageButton';

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
    : person.role === 'speaker' ? 'Speaker'
    : person.role === 'chapter_lead' ? 'Chapter Lead'
    : person.role === 'student' ? 'Student' : 'Member';

  return (
    <main className="wrap" style={{ maxWidth: 900 }}>
      <a href="/dashboard" className="mute" style={{ fontSize: 15 }}>← Back to dashboard</a>

      <header className="surf" style={{ marginTop: 16, overflow: 'hidden' }}>
        <div style={{
          height: 132,
          background: 'linear-gradient(120deg, var(--ink) 0%, var(--gold-700) 58%, var(--grn) 100%)',
        }} />
        <div style={{ padding: '0 clamp(22px,3.5vw,38px) clamp(26px,3.5vw,34px)' }}>
          <div style={{ marginTop: -62, display: 'inline-block' }}>
            <Avatar src={person.photo_url} name={person.full_name} email={person.email} size={136} ring />
          </div>

          <div className="row" style={{ gap: 12, marginTop: 16, alignItems: 'baseline' }}>
            <h1 style={{ fontSize: 'clamp(34px,3.8vw,48px)', margin: 0 }}>
              {person.full_name || 'Member'}
            </h1>
            {person.pronouns && (
              <span className="mute" style={{ fontSize: 17 }}>{person.pronouns}</span>
            )}
            <span className={'pill ' + (person.role === 'admin' ? 'pill-ok' : 'pill-wait')}>{roleLabel}</span>
          </div>

          {person.role_level && (
            <p style={{ fontSize: 21, lineHeight: 1.4, margin: '10px 0 0', fontWeight: 500 }}>
              {person.role_level}
              {showEmployer && person.employer && (
                <span className="mute" style={{ fontWeight: 400 }}> · {person.employer}</span>
              )}
            </p>
          )}

          <div className="row" style={{ gap: 16, marginTop: 10 }}>
            {showCity && person.city && (
              <span className="mute" style={{ fontSize: 16 }}>{person.city} chapter</span>
            )}
            {person.years_experience != null && (
              <span className="mute" style={{ fontSize: 16 }}>{person.years_experience} years' experience</span>
            )}
          </div>

          {person.intro && (
            <p style={{ fontSize: 18.5, lineHeight: 1.65, margin: '18px 0 0', maxWidth: '58ch' }}>
              {person.intro}
            </p>
          )}

          <div className="row" style={{ gap: 10, marginTop: 24 }}>
            {isSelf && <a className="btn btn-primary" href="/profile">Edit my profile</a>}
            {!isSelf && allowContact && <MessageButton otherId={person.id} />}
            {person.linkedin_url && (
              <a className="btn btn-out" href={person.linkedin_url} target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
            )}
          </div>
        </div>
      </header>

      {(person.open_to_mentoring || person.seeking_mentor) && (
        <div className="row" style={{ gap: 10, marginTop: 18 }}>
          {person.open_to_mentoring && (
            <span className="tag" style={{ fontSize: 15, padding: '7px 15px' }}>Open to mentoring</span>
          )}
          {person.seeking_mentor && (
            <span className="tag" style={{ fontSize: 15, padding: '7px 15px' }}>Looking for a mentor</span>
          )}
        </div>
      )}

      <section className="surf" style={{ padding: 'clamp(24px,3.2vw,36px)', marginTop: 18 }}>
        <h2 style={{ fontSize: 30 }}>Experience</h2>
        {grouped.size === 0 ? (
          <p className="mute" style={{ marginTop: 14, fontSize: 17 }}>
            {isSelf ? "You haven't mapped your experience yet." : 'Nothing mapped yet.'}
          </p>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
            gap: 28, marginTop: 24,
          }}>
            {GROUPS.filter(([key]) => grouped.has(key)).map(([key, label]) => (
              <div key={key}>
                <p style={{
                  fontSize: 13.5, fontWeight: 600, letterSpacing: '.09em',
                  textTransform: 'uppercase', color: 'var(--gold-700)', margin: 0,
                }}>{label}</p>
                <div className="chips" style={{ marginTop: 11 }}>
                  {grouped.get(key)!.map((v) => (
                    <span key={v} className="tag" style={{ fontSize: 15, padding: '7px 14px' }}>{v}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {!!posts?.length && (
        <section className="surf" style={{ padding: 'clamp(24px,3.2vw,36px)', marginTop: 18 }}>
          <h2 style={{ fontSize: 30 }}>Recent posts</h2>
          <div className="grid" style={{ gap: 18, marginTop: 20 }}>
            {posts.map((p: any) => (
              <article key={p.id} style={{
                borderLeft: '3px solid var(--gold-200)', paddingLeft: 18,
              }}>
                <p className="mute" style={{ margin: 0, fontSize: 14.5 }}>
                  {new Date(p.created_at).toLocaleDateString('en-CA', { dateStyle: 'medium' })}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 17, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                  {p.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
