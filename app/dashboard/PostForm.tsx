'use client';
import { useRef, useState, useTransition } from 'react';
import { createPost } from '@/app/actions/feed';

export function PostForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form ref={ref} className="surf" style={{ padding: 20 }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await createPost(fd);
          if (res?.error) setError(res.error);
          else { setError(null); ref.current?.reset(); }
        });
      }}>
      <label className="fld" style={{ marginBottom: 12 }}>
        <span>Post to your chapter</span>
        <textarea name="body" required placeholder="What are you working through this week?" />
      </label>
      {error && <p className="err">{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Posting…' : 'Post'}
      </button>
    </form>
  );
}
