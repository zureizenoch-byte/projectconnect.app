'use client';

import { useMemo, useState } from 'react';
import { Avatar } from '@/components/Avatar';

type Person = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  role_level: string | null;
  employer: string | null;
  city: string | null;
  intro: string | null;
  years_experience: number | null;
  linkedin_url: string | null;
  tags: { category: string; value: string }[];
};

const GROUPS: [string, string][] = [
  ['domain', 'Domains'],
  ['transformation_type', 'Transformation types'],
  ['method', 'Methods'],
  ['industry', 'Industries'],
  ['certification', 'Certifications'],
  ['tool', 'Tools'],
  ['language', 'Languages'],
];

/**
 * Talent search over member profiles. Filtering happens in the browser: the
 * membership is small enough that a round trip per keystroke would be slower
 * than it is useful, and a recruiter refining a shortlist types constantly.
 */
export function TalentSearch({ people, cities, levels }: {
  people: Person[];
  cities: string[];
  levels: string[];
}) {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [level, setLevel] = useState('');
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const terms = useMemo(
    () => query.toLowerCase().split(/[\s,]+/).filter(Boolean),
    [query],
  );

  const results = useMemo(() => people.filter((p) => {
    if (city && p.city !== city) return false;
    if (level && p.role_level !== level) return false;
    if (!terms.length) return true;

    // every term must appear somewhere — name, role, employer, intro or a tag
    const haystack = [
      p.full_name, p.role_level, p.employer, p.city, p.intro,
      ...p.tags.map((t) => t.value),
    ].filter(Boolean).join(' ').toLowerCase();

    return terms.every((t) => haystack.includes(t));
  }), [people, terms, city, level]);

  const toggle = (id: string) =>
    setShortlist((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const copyShortlist = () => {
    const lines = shortlist
      .map((id) => people.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => [
        p!.full_name ?? 'Member',
        p!.role_level, p!.employer, p!.city,
        p!.linkedin_url,
      ].filter(Boolean).join(' · '));
    navigator.clipboard?.writeText(lines.join('\n'));
  };

  return (
    <>
      <div className="surf" style={{ padding: 'clamp(18px,2.5vw,24px)', marginTop: 24 }}>
        <label className="fld" style={{ marginBottom: 14 }}>
          <span>Search</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Agile coach, PMP, banking, Toronto — any combination" />
          <span className="hint">
            Every word has to match something: a name, role, employer, introduction, or any
            experience tag.
          </span>
        </label>

        <div className="grid g2">
          <label className="fld" style={{ marginBottom: 0 }}>
            <span>Chapter</span>
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">Any chapter</option>
              {cities.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="fld" style={{ marginBottom: 0 }}>
            <span>Role level</span>
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">Any level</option>
              {levels.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
        </div>

        <div className="row" style={{ marginTop: 16, gap: 12 }}>
          <span className="mute small">
            {results.length} of {people.length} {people.length === 1 ? 'member' : 'members'}
          </span>
          {(query || city || level) && (
            <button type="button" className="btn btn-quiet"
              style={{ minHeight: 34, padding: '0 12px', fontSize: 14 }}
              onClick={() => { setQuery(''); setCity(''); setLevel(''); }}>Clear</button>
          )}
          {shortlist.length > 0 && (
            <>
              <span className="pill pill-wait" style={{ marginLeft: 'auto' }}>
                {shortlist.length} shortlisted
              </span>
              <button type="button" className="btn btn-out"
                style={{ minHeight: 34, padding: '0 12px', fontSize: 14 }}
                onClick={copyShortlist}>Copy shortlist</button>
              <button type="button" className="btn btn-quiet"
                style={{ minHeight: 34, padding: '0 12px', fontSize: 14 }}
                onClick={() => setShortlist([])}>Clear</button>
            </>
          )}
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 16, marginTop: 20, alignItems: 'start',
      }}>
        {results.map((p) => {
          const isOpen = open === p.id;
          const listed = shortlist.includes(p.id);
          const grouped = new Map<string, string[]>();
          for (const t of p.tags) {
            if (!grouped.has(t.category)) grouped.set(t.category, []);
            grouped.get(t.category)!.push(t.value);
          }

          return (
            <article key={p.id} className="surf" style={{
              padding: 20,
              borderColor: listed ? 'var(--gold)' : 'var(--line)',
            }}>
              <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
                <Avatar src={p.photo_url} name={p.full_name} size={56} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a href={'/members/' + p.id}
                    style={{ fontWeight: 600, fontSize: 17, color: 'var(--ink)', textDecoration: 'none' }}>
                    {p.full_name ?? 'Member'}
                  </a>
                  <p className="mute small" style={{ margin: '3px 0 0' }}>
                    {[p.role_level, p.employer].filter(Boolean).join(' · ') || '—'}
                  </p>
                  <p className="mute small" style={{ margin: '2px 0 0' }}>
                    {[p.city, p.years_experience ? p.years_experience + ' yrs' : null]
                      .filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button type="button" onClick={() => toggle(p.id)}
                  aria-pressed={listed} className={listed ? 'btn btn-gold' : 'btn btn-out'}
                  style={{ minHeight: 32, padding: '0 10px', fontSize: 13 }}>
                  {listed ? 'Listed' : 'Shortlist'}
                </button>
              </div>

              {p.intro && (
                <p style={{ margin: '12px 0 0', fontSize: 14.5, lineHeight: 1.6 }}>{p.intro}</p>
              )}

              {grouped.size > 0 && (
                <>
                  <div className="row" style={{ gap: 6, marginTop: 12 }}>
                    {(grouped.get('domain') ?? []).slice(0, 3).map((v) => (
                      <span key={v} className="tag">{v}</span>
                    ))}
                  </div>
                  <button type="button" className="btn btn-quiet"
                    style={{ minHeight: 32, padding: '0 10px', fontSize: 13.5, marginTop: 10 }}
                    onClick={() => setOpen(isOpen ? null : p.id)}>
                    {isOpen ? 'Hide experience' : 'Full experience'}
                  </button>
                </>
              )}

              {isOpen && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                  {GROUPS.filter(([k]) => grouped.has(k)).map(([k, label]) => (
                    <div key={k} style={{ marginBottom: 12 }}>
                      <p className="eyebrow" style={{ margin: 0 }}>{label}</p>
                      <div className="row" style={{ gap: 6, marginTop: 6 }}>
                        {grouped.get(k)!.map((v) => <span key={v} className="tag">{v}</span>)}
                      </div>
                    </div>
                  ))}
                  {p.linkedin_url && (
                    <a className="btn btn-out" href={p.linkedin_url}
                      target="_blank" rel="noopener noreferrer"
                      style={{ minHeight: 36, padding: '0 14px', fontSize: 13.5 }}>LinkedIn</a>
                  )}
                </div>
              )}
            </article>
          );
        })}

        {!results.length && (
          <div className="surf" style={{
            gridColumn: '1 / -1', padding: 'clamp(24px,4vw,40px)', textAlign: 'center',
          }}>
            <h3 style={{ fontSize: 20 }}>Nobody matches that</h3>
            <p className="mute" style={{ margin: '8px auto 0', maxWidth: '40ch' }}>
              Try fewer words, or drop the chapter and level filters.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
