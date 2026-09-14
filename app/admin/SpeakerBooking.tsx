'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { bookSpeaker } from '@/app/actions/admin';
import { Avatar } from '@/components/Avatar';

type Speaker = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  role_level: string | null;
  employer: string | null;
  city: string | null;
  intro: string | null;
  topics: string[];
};

/**
 * Booking a speaker, not filling in a form: pick a person from the pool, and
 * their own stated topics become the shortlist. Everything else — place, date,
 * seats — follows from that choice.
 */
export function SpeakerBooking({ speakers, chapters, venues }: {
  speakers: Speaker[];
  chapters: { id: string; city: string }[];
  venues: { id: string; name: string; chapter_id: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Speaker | null>(null);
  const [topic, setTopic] = useState('');
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? '');
  const [format, setFormat] = useState<'in_person' | 'online'>('in_person');

  const online = format === 'online';

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return speakers;
    return speakers.filter((s) =>
      (s.full_name ?? '').toLowerCase().includes(q)
      || (s.employer ?? '').toLowerCase().includes(q)
      || s.topics.some((t) => t.toLowerCase().includes(q)));
  }, [speakers, query]);

  const chapterVenues = venues.filter((v) => v.chapter_id === chapterId);
  const ready = !!picked && topic.trim().length > 0;

  if (!speakers.length) {
    return (
      <div className="surf" style={{ padding: 22, marginTop: 14 }}>
        <p className="mute" style={{ margin: 0 }}>
          No approved speakers yet. Approve a speaker application above, or grant someone the
          speaker role, and they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="surf" style={{ padding: 'clamp(20px,3vw,28px)', marginTop: 14 }}>
      <div className="fld" style={{ marginBottom: 18 }}>
        <span>Find a speaker</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, organisation or topic" />
        <span className="hint">
          {speakers.length} approved {speakers.length === 1 ? 'speaker' : 'speakers'} in the pool
          {query.trim() && ' · ' + shown.length + ' matching'}
        </span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        {shown.map((s) => {
          const active = picked?.id === s.id;
          return (
            <button key={s.id} type="button"
              onClick={() => {
                setPicked(s);
                setTopic(s.topics[0] ?? '');
                if (s.city) {
                  const home = chapters.find((c) => c.city === s.city);
                  if (home) setChapterId(home.id);
                }
              }}
              style={{
                textAlign: 'left', cursor: 'pointer', padding: 16, borderRadius: 14,
                border: '1px solid ' + (active ? 'var(--gold)' : 'var(--line)'),
                background: active ? 'var(--gold-100)' : '#fff',
                font: 'inherit', color: 'var(--ink)',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
              <Avatar src={s.photo_url} name={s.full_name} size={46} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 600, fontSize: 16 }}>
                  {s.full_name ?? 'Speaker'}
                </span>
                <span className="mute" style={{ display: 'block', fontSize: 13.5, marginTop: 2 }}>
                  {[s.role_level, s.employer].filter(Boolean).join(' · ') || 'Speaker'}
                </span>
                {s.topics.length > 0 && (
                  <span className="mute" style={{
                    display: 'block', fontSize: 13, marginTop: 6, lineHeight: 1.5,
                  }}>
                    {s.topics.slice(0, 3).join(' · ')}
                    {s.topics.length > 3 && ' +' + (s.topics.length - 3)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
        {!shown.length && (
          <p className="mute small" style={{ margin: 0 }}>Nobody in the pool matches that.</p>
        )}
      </div>

      {picked && (
        <form
          onKeyDown={(e) => {
            const el = e.target as HTMLElement;
            if (e.key === 'Enter' && el.tagName !== 'TEXTAREA' && el.getAttribute('type') !== 'submit') {
              e.preventDefault();
            }
          }}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set('speaker_id', picked.id);
            fd.set('topic', topic);
            fd.set('format', format);
            start(async () => {
              const res: any = await bookSpeaker(fd);
              if (res?.error) { setIsError(true); setMsg(res.error); }
              else {
                setIsError(false);
                setMsg(res.ok);
                setPicked(null);
                setTopic('');
                router.refresh();
              }
            });
          }}
          style={{ paddingTop: 22, borderTop: '1px solid var(--line)' }}>

          <p className="eyebrow" style={{ marginBottom: 14 }}>
            Booking {picked.full_name ?? 'this speaker'}
          </p>

          <div className="fld">
            <span>Topic</span>
            {picked.topics.length > 0 && (
              <div className="chips" style={{ marginBottom: 10 }}>
                {picked.topics.map((t) => (
                  <button key={t} type="button" className="chip"
                    aria-pressed={topic === t}
                    onClick={() => setTopic(t)}>{t}</button>
                ))}
              </div>
            )}
            <input value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder="What they will speak on" required maxLength={200} />
            <span className="hint">
              {picked.topics.length > 0
                ? 'Their stated topics are above — or write your own.'
                : 'They have not listed topics yet, so name the subject here.'}
            </span>
          </div>

          <label className="fld"><span>Description</span>
            <textarea name="description" maxLength={4000}
              placeholder="What attendees should expect, and who it is for." />
          </label>

          <fieldset style={{ border: 0, padding: 0, margin: '0 0 18px' }}>
            <legend style={{ fontSize: 17.5, fontWeight: 600, marginBottom: 10 }}>Where</legend>
            <div className="row" style={{ gap: 10 }}>
              {([['in_person', 'In person'], ['online', 'Online']] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setFormat(value)}
                  style={{
                    flex: '1 1 150px', cursor: 'pointer', padding: '12px 16px', borderRadius: 12,
                    font: 'inherit', fontSize: 15, color: 'var(--ink)',
                    border: '1px solid ' + (format === value ? 'var(--gold)' : 'var(--line)'),
                    background: format === value ? 'var(--gold-100)' : '#fff',
                  }}>{label}</button>
              ))}
            </div>
          </fieldset>

          <div className="grid g2">
            <label className="fld"><span>Chapter</span>
              <select name="chapter_id" value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}>
                {chapters.map((c) => <option key={c.id} value={c.id}>{c.city}</option>)}
              </select>
            </label>

            {online ? (
              <label className="fld"><span>Meeting link</span>
                <input name="meeting_url" type="url" placeholder="https://meet.google.com/…" />
              </label>
            ) : (
              <label className="fld"><span>Venue</span>
                <select name="venue_id" defaultValue="">
                  <option value="">To be decided</option>
                  {chapterVenues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </label>
            )}

            <label className="fld"><span>Date and time</span>
              <input name="starts_at" type="datetime-local" required />
            </label>

            <label className="fld"><span>Seats</span>
              <input name="seat_cap" type="number" min={2} max={online ? 100 : 15}
                defaultValue={online ? 40 : 15} key={format} />
            </label>
          </div>

          {online && (
            <label className="fld"><span>Joining note</span>
              <input name="meeting_note" maxLength={300}
                placeholder="Passcode, dial-in, or how early to join" />
            </label>
          )}

          {msg && (
            <p className={isError ? 'err' : 'hint'} style={!isError ? { color: 'var(--ok)' } : undefined}>
              {msg}
            </p>
          )}

          <div className="row" style={{ gap: 10, marginTop: 6 }}>
            <button className="btn btn-primary" type="submit" disabled={pending || !ready}>
              {pending ? 'Booking…' : 'Book this talk'}
            </button>
            <button className="btn btn-quiet" type="button"
              onClick={() => { setPicked(null); setTopic(''); setMsg(null); }}>
              Pick someone else
            </button>
          </div>
          <p className="hint">
            Published straight away. The speaker is notified, and the venue hears from us if one is set.
          </p>
        </form>
      )}

      {!picked && msg && (
        <p className={isError ? 'err' : 'hint'} style={!isError ? { color: 'var(--ok)' } : undefined}>
          {msg}
        </p>
      )}
    </div>
  );
}
