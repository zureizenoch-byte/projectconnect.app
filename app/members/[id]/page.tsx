import { notFound } from 'next/navigation';
import { AvatarZoom } from '@/components/AvatarZoom';
import { requireSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { Avatar } from '@/components/Avatar';
import { planBadge } from '@/components/MemberBadge';
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

  // A block works both ways, like every other network: neither person can
  // reach the other's profile. Worded as privacy, so the block is never
  // disclosed to the person who was blocked.
  //
  // A failed query counts as blocked. Erring the other way would quietly
  // reopen a profile someone deliberately closed.
  let blocked = false;
  if (!isSelf && !isAdmin) {
    const { data: blockRows, error: blockError } = await db
      .from('blocks')
      .select('blocker_id,blocked_id')
      .or(
        'and(blocker_id.eq.' + person.id + ',blocked_id.eq.' + viewer.id + '),'
        + 'and(blocker_id.eq.' + viewer.id + ',blocked_id.eq.' + person.id + ')',
      );
    blocked = !!blockError || (blockRows ?? []).length > 0;
  }

  if (blocked) {
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

  const { data: plan } = await db.from('subscriptions')
    .select('tier,status').eq('profile_id', params.id).maybeSingle();
  const planTag = planBadge(plan?.tier, plan?.status);

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

  // ---- the record: what this person has actually turned up to ----
  const { data: theirSeats } = await db.from('event_seats')
    .select('event_id,status,events(id,title,kind,starts_at,status,venues(name,address))')
    .eq('profile_id', params.id).neq('status', 'cancelled');

  const attended = (theirSeats ?? []).filter((s: any) =>
    s.events && s.events.status !== 'cancelled' && new Date(s.events.starts_at) < new Date());

  const record = {
    meetups: attended.filter((s: any) => s.events.kind === 'meetup').length,
    talks: attended.filter((s: any) => s.events.kind === 'talk').length,
    posts: (posts ?? []).length,
  };

  const { count: hostedCount } = await db.from('events')
    .select('id', { count: 'exact', head: true })
    .or('host_id.eq.' + params.id + ',created_by.eq.' + params.id)
    .neq('status', 'cancelled');

  // ---- common ground: the thing this whole app is built on ----
  const { data: myTags } = isSelf
    ? { data: [] as any[] }
    : await db.from('profile_tags').select('category,value').eq('profile_id', viewer.id);

  const mineByCategory = new Map<string, Set<string>>();
  for (const t of myTags ?? []) {
    if (!mineByCategory.has(t.category)) mineByCategory.set(t.category, new Set());
    mineByCategory.get(t.category)!.add(t.value);
  }

  const sharedIn = (category: string) =>
    (grouped.get(category) ?? []).filter((v) => mineByCategory.get(category)?.has(v));

  const shared = {
    domains: isSelf ? [] : sharedIn('domain'),
    industries: isSelf ? [] : sharedIn('industry'),
    methods: isSelf ? [] : sharedIn('method'),
  };
  const sharedCount = shared.domains.length + shared.industries.length + shared.methods.length;
  const sameChapter = !isSelf && !!person.city && person.city === viewer.city;

  // have we sat at the same table, and are we booked on the same one next?
  const theirEventIds = (theirSeats ?? []).map((s: any) => s.event_id);
  const { data: myOverlap } = isSelf || !theirEventIds.length
    ? { data: [] as any[] }
    : await db.from('event_seats')
        .select('event_id,events(id,title,kind,starts_at,status,venues(name,address))')
        .eq('profile_id', viewer.id).neq('status', 'cancelled')
        .in('event_id', theirEventIds);

  const overlaps = (myOverlap ?? []).filter((s: any) => s.events && s.events.status !== 'cancelled');
  const now = Date.now();
  const together = overlaps.filter((s: any) => +new Date(s.events.starts_at) < now).length;
  const upcomingTogether = overlaps
    .filter((s: any) => +new Date(s.events.starts_at) >= now)
    .sort((a: any, b: any) => +new Date(a.events.starts_at) - +new Date(b.events.starts_at))[0];

  // for your own profile, the tags that are driving your invitations
  const myDriving = isSelf
    ? {
        domains: grouped.get('domain') ?? [],
        industries: grouped.get('industry') ?? [],
        methods: grouped.get('method') ?? [],
      }
    : null;

  // How far each tag reaches, and who it reaches — a list of words is not much
  // of a reason to fill this in; eleven people who did the same work is.
  let reach: { value: string; members: number }[] = [];
  let peopleLikeYou: any[] = [];
  let openEvents = 0;

  if (isSelf) {
    const myDomains = grouped.get('domain') ?? [];

    if (myDomains.length) {
      const { data: sharers } = await db.from('profile_tags')
        .select('profile_id,value')
        .eq('category', 'domain')
        .in('value', myDomains)
        .neq('profile_id', viewer.id);

      const perValue = new Map<string, number>();
      const seen = new Map<string, Set<string>>();
      for (const row of sharers ?? []) {
        perValue.set(row.value, (perValue.get(row.value) ?? 0) + 1);
        if (!seen.has(row.profile_id)) seen.set(row.profile_id, new Set());
        seen.get(row.profile_id)!.add(row.value);
      }

      reach = myDomains
        .map((v) => ({ value: v, members: perValue.get(v) ?? 0 }))
        .sort((a, b) => b.members - a.members);

      // the people, most overlap first — visible proof the mapping is worth doing
      const candidateIds = [...seen.keys()];
      if (candidateIds.length) {
        const { data: others } = await db.from('profiles')
          .select('id,full_name,photo_url,role_level,city')
          .in('id', candidateIds)
          .limit(60);

        const { data: theirPrivacy } = await db.from('privacy_settings')
          .select('profile_id,visible_to_members').in('profile_id', candidateIds);
        const hidden = new Set((theirPrivacy ?? [])
          .filter((r: any) => r.visible_to_members === false).map((r: any) => r.profile_id));

        peopleLikeYou = (others ?? [])
          .filter((o: any) => !hidden.has(o.id))
          .map((o: any) => ({ ...o, shared: [...(seen.get(o.id) ?? [])] }))
          .sort((a: any, b: any) =>
            b.shared.length - a.shared.length
            || (a.city === person.city ? -1 : 1))
          .slice(0, 8);
      }
    }

    // a zero is only worth showing next to something you can do about it
    const { count: openCount } = await db.from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('starts_at', new Date().toISOString());
    openEvents = openCount ?? 0;
  }

  const hasRecord = record.meetups + record.talks + (hostedCount ?? 0) > 0;

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
        <div className="profilegrid" style={{ padding: '0 clamp(22px,3.5vw,38px) clamp(26px,3.5vw,34px)' }}>
          <div className="profileident">
          <div style={{ marginTop: -62, display: 'inline-block' }}>
            <AvatarZoom src={person.photo_url} name={person.full_name} email={person.email} size={136} ring />
          </div>

          <div className="row" style={{ gap: 12, marginTop: 16, alignItems: 'baseline' }}>
            <h1 style={{ fontSize: 'clamp(34px,3.8vw,48px)', margin: 0 }}>
              {person.full_name || 'Member'}
            </h1>
            {person.pronouns && (
              <span className="mute" style={{ fontSize: 17 }}>{person.pronouns}</span>
            )}
            <span className={'pill ' + (person.role === 'admin' ? 'pill-ok' : 'pill-wait')}>{roleLabel}</span>
            {planTag && (
              <span className="pill" style={planTag === 'Premium'
                ? {
                    background: 'linear-gradient(100deg,var(--gold),var(--grn))',
                    border: '1px solid transparent', color: '#fff',
                  }
                : {
                    background: 'var(--gold-100)',
                    border: '1px solid var(--gold)', color: 'var(--gold-700)',
                  }}>{planTag}</span>
            )}
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

          {(person.ask_me_about || person.looking_for) && (
            <div style={{
              marginTop: 22, display: 'grid', gap: 16, maxWidth: '54ch',
            }}>
              {person.ask_me_about && (
                <div style={{ borderLeft: '3px solid var(--gold)', paddingLeft: 16 }}>
                  <p style={{
                    fontSize: 12.5, fontWeight: 600, letterSpacing: '.09em',
                    textTransform: 'uppercase', color: 'var(--gold-700)', margin: 0,
                  }}>Ask me about</p>
                  <p style={{ fontSize: 18, lineHeight: 1.55, margin: '6px 0 0' }}>
                    {person.ask_me_about}
                  </p>
                </div>
              )}
              {person.looking_for && (
                <div style={{ borderLeft: '3px solid var(--gold-200)', paddingLeft: 16 }}>
                  <p style={{
                    fontSize: 12.5, fontWeight: 600, letterSpacing: '.09em',
                    textTransform: 'uppercase', color: 'var(--gold-700)', margin: 0,
                  }}>{isSelf ? "You're looking for" : "They're looking for"}</p>
                  <p style={{ fontSize: 18, lineHeight: 1.55, margin: '6px 0 0' }}>
                    {person.looking_for}
                  </p>
                </div>
              )}
            </div>
          )}

          {(person.availability || person.open_to_mentoring || person.seeking_mentor) && (
            <div className="row" style={{ gap: 18, marginTop: 20, rowGap: 8 }}>
              {person.availability && (
                <span className="mute" style={{ fontSize: 15.5 }}>
                  Usually free · {person.availability}
                </span>
              )}
              {(person.open_to_mentoring || person.seeking_mentor) && (
                <span className="mute" style={{ fontSize: 15.5 }}>
                  {[
                    person.open_to_mentoring && 'Happy to mentor',
                    person.seeking_mentor && 'Looking for a mentor',
                  ].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
          )}

          {isSelf && !person.ask_me_about && !person.looking_for && (
            <p className="mute" style={{
              fontSize: 15, lineHeight: 1.6, margin: '20px 0 0', maxWidth: '46ch',
              padding: '14px 16px', borderRadius: 12,
              border: '1px dashed var(--gold-200)', background: 'var(--gold-100)',
            }}>
              Two lines — <strong style={{ color: 'var(--ink)' }}>Ask me about</strong> and{' '}
              <strong style={{ color: 'var(--ink)' }}>I'm looking for</strong> — give people a
              reason to walk over. Add them from Edit my profile.
            </p>
          )}

          {isSelf && !hasRecord && (
            <div style={{
              marginTop: 24, padding: 'clamp(18px,2.5vw,24px)', borderRadius: 16,
              border: '1px solid var(--gold-200)',
              background: 'linear-gradient(140deg, var(--gold-100), #fff)',
              maxWidth: '52ch',
            }}>
              <p style={{
                fontSize: 12.5, fontWeight: 600, letterSpacing: '.09em',
                textTransform: 'uppercase', color: 'var(--gold-700)', margin: 0,
              }}>Your first meetup</p>
              <p style={{ fontSize: 19, lineHeight: 1.5, margin: '10px 0 0', fontWeight: 500 }}>
                {openEvents > 0
                  ? 'You haven\u2019t been to one yet.'
                  : 'You haven\u2019t been to one yet.'}
              </p>
              <p className="mute" style={{ fontSize: 15.5, lineHeight: 1.6, margin: '6px 0 0' }}>
                {openEvents > 0
                  ? 'There ' + (openEvents === 1 ? 'is 1 open' : 'are ' + openEvents + ' open')
                    + ' right now \u2014 a table of a dozen people who do what you do.'
                  : 'Nothing is scheduled at the moment. We\u2019ll tell you as soon as there is.'}
              </p>
              <div className="row" style={{ gap: 10, marginTop: 18 }}>
                {openEvents > 0 && (
                  <a className="btn btn-gold" href="/events"
                    style={{ minHeight: 44, padding: '0 22px', fontSize: 15 }}>See events</a>
                )}
                <span className="mute small">
                  Member since {new Date(person.created_at).toLocaleDateString('en-CA', {
                    month: 'long', year: 'numeric',
                  })}
                </span>
              </div>
            </div>
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

          <aside className="profileside">
            {/* What you share — the premise of the app, on the page where people decide to talk */}
            <div style={{
              padding: 20, borderRadius: 16,
              border: '1px solid var(--gold-200)', background: 'var(--gold-100)',
            }}>
              <p style={{
                fontSize: 12.5, fontWeight: 600, letterSpacing: '.09em',
                textTransform: 'uppercase', color: 'var(--gold-700)', margin: 0,
              }}>{isSelf ? 'How you get matched' : 'What you share'}</p>

              {isSelf ? (
                myDriving && (myDriving.domains.length || myDriving.industries.length) ? (
                  <>
                    <p className="mute" style={{ fontSize: 14.5, lineHeight: 1.6, margin: '10px 0 14px' }}>
                      These are the tags putting you at a table with the right people.
                    </p>
                    {reach.length > 0 ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {reach.slice(0, 5).map((r) => (
                          <div key={r.value} className="row" style={{
                            gap: 10, justifyContent: 'space-between',
                            padding: '8px 12px', borderRadius: 10,
                            background: '#fff', border: '1px solid var(--gold-200)',
                          }}>
                            <span style={{ fontSize: 14.5, minWidth: 0 }}>{r.value}</span>
                            <span className="mute" style={{ fontSize: 13.5, whiteSpace: 'nowrap' }}>
                              {r.members === 0 ? 'only you' : r.members + ' member' + (r.members === 1 ? '' : 's')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <CommonList label="Domains" values={myDriving.domains.slice(0, 4)} />
                        <CommonList label="Methods" values={myDriving.methods.slice(0, 3)} />
                      </>
                    )}
                    <a className="btn btn-out" href="/profile"
                      style={{ marginTop: 14, width: '100%', minHeight: 40, fontSize: 14 }}>
                      Add more
                    </a>
                  </>
                ) : (
                  <>
                    <p className="mute" style={{ fontSize: 14.5, lineHeight: 1.6, margin: '10px 0 14px' }}>
                      Nothing mapped yet, so matching has little to work with. A few domains is enough
                      to start.
                    </p>
                    <a className="btn btn-gold" href="/profile"
                      style={{ width: '100%', minHeight: 42, fontSize: 14.5 }}>Map my experience</a>
                  </>
                )
              ) : sharedCount > 0 || sameChapter || together > 0 ? (
                <>
                  <p style={{ fontSize: 15.5, lineHeight: 1.6, margin: '10px 0 14px' }}>
                    {[
                      sharedCount > 0 && sharedCount + (sharedCount === 1 ? ' thing' : ' things') + ' in common',
                      sameChapter && 'same chapter',
                      together > 0 && 'met ' + together + (together === 1 ? ' time' : ' times') + ' already',
                    ].filter(Boolean).join(' · ')}
                  </p>
                  <CommonList label="Domains" values={shared.domains.slice(0, 4)} />
                  <CommonList label="Industries" values={shared.industries.slice(0, 3)} />
                  <CommonList label="Methods" values={shared.methods.slice(0, 3)} />
                </>
              ) : (
                <p className="mute" style={{ fontSize: 14.5, lineHeight: 1.6, margin: '10px 0 0' }}>
                  Nothing mapped in common yet — which is often the more interesting table.
                </p>
              )}
            </div>

            {/* Booked on the same event: a reason to say hello before the day */}
            {upcomingTogether && (
              <a href={'/events/' + upcomingTogether.events.id} style={{
                display: 'block', padding: 18, borderRadius: 16, textDecoration: 'none',
                border: '1px solid var(--line)', background: '#fff', color: 'inherit',
              }}>
                <p style={{
                  fontSize: 12.5, fontWeight: 600, letterSpacing: '.09em',
                  textTransform: 'uppercase', color: 'var(--gold-700)', margin: 0,
                }}>You're both going</p>
                <p style={{ fontSize: 16.5, fontWeight: 600, margin: '8px 0 0', lineHeight: 1.3 }}>
                  {upcomingTogether.events.title}
                </p>
                <p className="mute small" style={{ margin: '4px 0 0' }}>
                  {new Date(upcomingTogether.events.starts_at).toLocaleDateString('en-CA', {
                    weekday: 'long', month: 'long', day: 'numeric',
                  })}
                  {upcomingTogether.events.venues?.name ? ' · ' + upcomingTogether.events.venues.name : ''}
                </p>
              </a>
            )}

            {/* Your tags are only worth filling in if they lead somewhere. */}
            {isSelf && peopleLikeYou.length > 0 && (
              <div style={{
                padding: 18, borderRadius: 16,
                border: '1px solid var(--line)', background: '#fff',
              }}>
                <p style={{
                  fontSize: 12.5, fontWeight: 600, letterSpacing: '.09em',
                  textTransform: 'uppercase', color: 'var(--gold-700)', margin: 0,
                }}>People like you</p>
                <p className="mute" style={{ fontSize: 14, lineHeight: 1.55, margin: '8px 0 14px' }}>
                  Members working in the same domains.
                </p>

                <div style={{ display: 'grid', gap: 10 }}>
                  {peopleLikeYou.slice(0, 5).map((o: any) => (
                    <a key={o.id} href={'/members/' + o.id} style={{
                      display: 'flex', gap: 11, alignItems: 'center',
                      textDecoration: 'none', color: 'inherit',
                    }}>
                      <Avatar src={o.photo_url} name={o.full_name} size={38} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{
                          display: 'block', fontSize: 14.5, fontWeight: 600,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{o.full_name || 'Member'}</span>
                        <span className="mute" style={{ display: 'block', fontSize: 13 }}>
                          {o.shared.length > 1
                            ? o.shared.length + ' domains in common'
                            : o.shared[0]}
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* The record — turning up is the currency here */}
            {hasRecord && (
              <div style={{
                padding: 18, borderRadius: 16,
                border: '1px solid var(--line)', background: '#fff',
              }}>
                <p style={{
                  fontSize: 12.5, fontWeight: 600, letterSpacing: '.09em',
                  textTransform: 'uppercase', color: 'var(--gold-700)', margin: '0 0 14px',
                }}>{isSelf ? 'Your record' : 'Their record'}</p>

                <div className="statgrid">
                  <Stat n={record.meetups} label="meetups" />
                  <Stat n={record.talks} label="talks" />
                  <Stat n={hostedCount ?? 0} label="hosted" />
                  <Stat n={record.posts} label="posts" />
                </div>

                <p className="mute small" style={{
                  margin: '16px 0 0', paddingTop: 14, borderTop: '1px solid var(--line)',
                }}>
                  Member since {new Date(person.created_at).toLocaleDateString('en-CA', {
                    month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
            )}

            {/* Someone else with no record still needs their join date stated */}
            {!isSelf && !hasRecord && (
              <div style={{
                padding: 18, borderRadius: 16,
                border: '1px solid var(--line)', background: '#fff',
              }}>
                <p style={{
                  fontSize: 12.5, fontWeight: 600, letterSpacing: '.09em',
                  textTransform: 'uppercase', color: 'var(--gold-700)', margin: 0,
                }}>Their record</p>
                <p className="mute" style={{ fontSize: 14.5, lineHeight: 1.6, margin: '8px 0 0' }}>
                  Nothing attended yet. Member since {new Date(person.created_at).toLocaleDateString('en-CA', {
                    month: 'long', year: 'numeric',
                  })}.
                </p>
              </div>
            )}

          </aside>
        </div>
      </header>

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

function CommonList({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <p className="mute" style={{ fontSize: 12.5, margin: '0 0 6px' }}>{label}</p>
      <div className="chips">
        {values.map((v) => (
          <span key={v} className="tag" style={{ fontSize: 13.5, padding: '5px 11px' }}>{v}</span>
        ))}
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <span style={{
        display: 'block', fontFamily: 'var(--font-heading)', fontWeight: 600,
        fontSize: 30, lineHeight: 1, letterSpacing: '-0.02em',
        color: n > 0 ? 'var(--ink)' : 'var(--mute)',
      }}>{n}</span>
      <span className="mute" style={{ fontSize: 13.5 }}>{label}</span>
    </div>
  );
}
