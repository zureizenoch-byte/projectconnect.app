'use client';

import { useState, useTransition } from 'react';
import { setReaction, addComment, deleteComment } from '@/app/actions/feed';
import { REACTIONS, MORE_REACTIONS, ALL_REACTIONS } from '@/lib/reactions';
import { EmojiPicker } from '@/components/EmojiPicker';

type Comment = { id: string; body: string; created_at: string; author_id: string; commenter?: { full_name?: string | null; photo_url?: string | null; speaker_approved?: boolean; role?: string } };

export function PostEngagement({
  postId, likeCount, liked, comments, userId, isAdmin,
  reactions = [], myReaction = null,
}: {
  postId: string; likeCount: number; liked: boolean;
  comments: Comment[]; userId: string; isAdmin: boolean;
  reactions?: string[]; myReaction?: string | null;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(comments);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);

  // held locally so a tap reads as instant, then confirmed by the server
  const [mine, setMine] = useState<string | null>(myReaction);
  const [tally, setTally] = useState<string[]>(reactions);
  const [picker, setPicker] = useState(false);
  const [more, setMore] = useState(false);

  const mineEmoji = ALL_REACTIONS.find((r) => r.key === mine)?.emoji;
  const mineLabel = ALL_REACTIONS.find((r) => r.key === mine)?.label;
  const count = tally.length;

  // which reactions this post actually has, most used first
  const shown = Array.from(new Set(tally))
    .sort((a, b) => tally.filter((x) => x === b).length - tally.filter((x) => x === a).length)
    .slice(0, 3)
    .map((key) => ALL_REACTIONS.find((r) => r.key === key)?.emoji)
    .filter(Boolean) as string[];

  const react = (key: string) => {
    setPicker(false);
    setMore(false);
    const wasMine = mine;
    // optimistic: drop the old, add the new, unless it is the same one
    setTally((t) => {
      const without = wasMine ? t.filter((x, i) => !(x === wasMine && t.indexOf(x) === i)) : [...t];
      return wasMine === key ? without : [...without, key];
    });
    setMine(wasMine === key ? null : key);

    start(async () => {
      const res: any = await setReaction(postId, key);
      if (res?.error) { setMine(wasMine); setTally(reactions); }
    });
  };

  const btn: React.CSSProperties = {
    minHeight: 38, padding: '0 14px', fontSize: 14, borderRadius: 10,
    border: '1px solid transparent', background: 'transparent',
    color: 'var(--mute)', cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', gap: 7, fontFamily: 'var(--font-body)',
    transition: 'background .16s ease, color .16s ease',
  };
  const active: React.CSSProperties = { ...btn, color: 'var(--gold-700)', background: 'var(--gold-100)' };

  const share = async () => {
    const url = window.location.origin + '/dashboard#post-' + postId;
    try {
      if (navigator.share) await navigator.share({ title: 'Project Connect', url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch {}
  };

  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
      {count > 0 && (
        <div className="row" style={{ gap: 8, marginBottom: 10 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 2,
            padding: '3px 9px 3px 7px', borderRadius: 999,
            background: '#fff', border: '1px solid var(--line)', boxShadow: 'var(--sh)',
          }}>
            {shown.map((emoji) => (
              <span key={emoji} aria-hidden style={{ fontSize: 15 }}>{emoji}</span>
            ))}
            <span className="mute" style={{ fontSize: 13, marginLeft: 4 }}>{count}</span>
          </span>
        </div>
      )}

      <div className="row" style={{ gap: 4 }}>
        <div style={{ position: 'relative' }}
          onMouseEnter={() => setPicker(true)}
          onMouseLeave={() => { if (!more) setPicker(false); }}>

          {picker && (
            <div role="menu" aria-label="React"
              style={{
                position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 30,
                background: '#fff', border: '1px solid var(--line)',
                borderRadius: more ? 18 : 999, boxShadow: 'var(--sh-lg)',
                padding: 6, maxWidth: 'min(320px, calc(100vw - 40px))',
              }}>

              {/* the six worth hitting without thinking */}
              <div style={{ display: 'flex', gap: 2 }}>
                {REACTIONS.map((r) => (
                  <button key={r.key} type="button" title={r.label} aria-label={r.label}
                    onClick={() => react(r.key)}
                    style={{
                      cursor: 'pointer', border: 0, borderRadius: '50%', padding: 0,
                      width: 38, height: 38, fontSize: 22, lineHeight: 1, flex: 'none',
                      background: mine === r.key ? 'var(--gold-100)' : 'transparent',
                      transition: 'transform .12s ease, background .12s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.22)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
                    {r.emoji}
                  </button>
                ))}

                <button type="button" onClick={() => setMore((m) => !m)}
                  aria-expanded={more} aria-label={more ? 'Fewer reactions' : 'More reactions'}
                  title={more ? 'Fewer' : 'More'}
                  style={{
                    cursor: 'pointer', borderRadius: '50%', padding: 0, flex: 'none',
                    width: 38, height: 38, fontSize: 19, lineHeight: 1,
                    border: '1px solid var(--line)',
                    background: more ? 'var(--gold-100)' : '#fff',
                    color: 'var(--mute)', marginLeft: 2,
                  }}>
                  {more ? '−' : '+'}
                </button>
              </div>

              {more && (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2,
                  marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)',
                  maxHeight: 176, overflowY: 'auto',
                }}>
                  {MORE_REACTIONS.map((r) => (
                    <button key={r.key} type="button" title={r.label} aria-label={r.label}
                      onClick={() => react(r.key)}
                      style={{
                        cursor: 'pointer', border: 0, borderRadius: 10, padding: 0,
                        height: 38, fontSize: 21, lineHeight: 1,
                        background: mine === r.key ? 'var(--gold-100)' : 'transparent',
                        transition: 'transform .12s ease, background .12s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.18)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
                      {r.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button style={mine ? active : btn} disabled={pending}
            onClick={() => {
              // tap opens the row on touch; a second tap on the same one clears it
              if (mine) react(mine);
              else setPicker((p) => !p);
            }}>
            {mineEmoji ? (
              <span aria-hidden style={{ fontSize: 17, lineHeight: 1 }}>{mineEmoji}</span>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
              </svg>
            )}
            {mine ? mineLabel : 'React'}
          </button>
        </div>

        <button style={open ? active : btn} onClick={() => setOpen(!open)}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {list.length === 0 ? 'Comment' : list.length + (list.length === 1 ? ' comment' : ' comments')}
        </button>

        <button style={btn} onClick={share}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          {copied ? 'Link copied' : 'Share'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 14 }}>
          <form style={{ display: 'flex', gap: 8 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              const body = draft;
              start(async () => {
                const res = await addComment(postId, body);
                if (res?.comment) { setList((l) => [...l, res.comment as Comment]); setDraft(''); }
              });
            }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment"
              style={{ flex: 1, minHeight: 44, padding: '10px 14px', fontFamily: 'var(--font-body)',
                fontSize: 15.5, border: '1px solid var(--line)', borderRadius: 12, background: '#fff' }} />
            <EmojiPicker onPick={(x) => setDraft((d) => d + x)} size={44} />
            <button className="btn btn-dark" type="submit" disabled={pending || !draft.trim()}
              style={{ minHeight: 44, padding: '0 18px', fontSize: 14.5 }}>Post</button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {list.map((c) => (
              <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start',
                border: '1px solid var(--line)', borderRadius: 12, padding: '11px 13px' }}>
                <span style={{ width: 34, height: 34, borderRadius: '50%', flex: 'none',
                  background: 'linear-gradient(145deg,#ccd6f8,#3352cf)',
                  backgroundImage: c.commenter?.photo_url ? 'url(' + c.commenter.photo_url + ')' : undefined,
                  backgroundSize: 'cover' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 14.5 }}>{c.commenter?.full_name ?? 'Former member'}</span>
                  {(c.commenter?.speaker_approved || c.commenter?.role === 'speaker') && (
                    <span className="pill pill-wait" style={{ marginLeft: 6, fontSize: 10 }}>Speaker</span>
                  )}
                  <span className="mute small" style={{ marginLeft: 8 }}>
                    {new Date(c.created_at).toLocaleDateString('en-CA', { dateStyle: 'medium' })}
                  </span>
                  <p style={{ fontSize: 15, lineHeight: 1.6, margin: '4px 0 0' }}>{c.body}</p>
                </div>
                {(c.author_id === userId || isAdmin) && (
                  <button style={{ ...btn, minHeight: 30, padding: '0 8px', fontSize: 13 }}
                    disabled={pending}
                    onClick={() => start(async () => {
                      const res = await deleteComment(c.id);
                      if (!res?.error) setList((l) => l.filter((x) => x.id !== c.id));
                    })}>Delete</button>
                )}
              </div>
            ))}
            {!list.length && <p className="mute small" style={{ margin: 0 }}>No comments yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
