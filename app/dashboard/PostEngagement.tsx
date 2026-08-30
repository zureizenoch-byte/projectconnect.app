'use client';

import { useState, useTransition } from 'react';
import { toggleLike, addComment, deleteComment } from '@/app/actions/feed';

type Comment = { id: string; body: string; created_at: string; author_id: string; profiles?: { full_name?: string } };

export function PostEngagement({
  postId, likeCount, liked, comments, userId, isAdmin,
}: {
  postId: string; likeCount: number; liked: boolean;
  comments: Comment[]; userId: string; isAdmin: boolean;
}) {
  const [pending, start] = useTransition();
  const [isLiked, setLiked] = useState(liked);
  const [count, setCount] = useState(likeCount);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(comments);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);

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
      <div className="row" style={{ gap: 4 }}>
        <button style={isLiked ? active : btn} disabled={pending}
          onClick={() => start(async () => {
            const res = await toggleLike(postId);
            if (!res?.error) { setLiked(!isLiked); setCount((c) => c + (isLiked ? -1 : 1)); }
          })}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
          </svg>
          {count > 0 ? count : ''} Like
        </button>

        <button style={open ? active : btn} onClick={() => setOpen(!open)}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {list.length > 0 ? list.length : ''} Comment
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
            <button className="btn btn-dark" type="submit" disabled={pending || !draft.trim()}
              style={{ minHeight: 44, padding: '0 18px', fontSize: 14.5 }}>Post</button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {list.map((c) => (
              <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start',
                border: '1px solid var(--line)', borderRadius: 12, padding: '11px 13px' }}>
                <span style={{ width: 34, height: 34, borderRadius: '50%', flex: 'none',
                  background: 'linear-gradient(145deg,#ccd6f8,#3352cf)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 14.5 }}>{c.profiles?.full_name ?? 'Member'}</span>
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
