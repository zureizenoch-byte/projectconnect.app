'use client';
import { useState, useTransition } from 'react';
import { deletePost } from '@/app/actions/feed';

export function PostActions({ postId }: { postId: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button className="btn btn-quiet" style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
        onClick={() => setConfirming(true)}>Delete</button>
    );
  }

  return (
    <span className="row" style={{ gap: 6 }}>
      <span className="small mute">Delete this post?</span>
      <button className="btn btn-out" style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
        disabled={pending}
        onClick={() => start(async () => {
          const res = await deletePost(postId);
          if (res?.error) { setError(res.error); setConfirming(false); }
        })}>{pending ? 'Deleting…' : 'Yes, delete'}</button>
      <button className="btn btn-quiet" style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
        onClick={() => setConfirming(false)}>Keep</button>
      {error && <span className="err">{error}</span>}
    </span>
  );
}
