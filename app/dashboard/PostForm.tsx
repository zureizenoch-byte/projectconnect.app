'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPost } from '@/app/actions/feed';

export function PostForm() {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const clearPhoto = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <form ref={ref} className="surf" style={{ padding: 20 }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await createPost(fd);
          if (res?.error) setError(res.error);
          else {
            setError(null);
            ref.current?.reset();
            clearPhoto();
            router.refresh();
          }
        });
      }}>

      <label className="fld" style={{ marginBottom: 12 }}>
        <span>Post to the community</span>
        <textarea name="body" placeholder="What are you working through this week?" />
      </label>

      {preview && (
        <div style={{
          position: 'relative', marginBottom: 14, borderRadius: 14,
          overflow: 'hidden', border: '1px solid var(--line)',
        }}>
          <img src={preview} alt=""
            style={{ display: 'block', width: '100%', maxHeight: 340, objectFit: 'cover' }} />
          <button type="button" onClick={clearPhoto} aria-label="Remove photo"
            style={{
              position: 'absolute', top: 10, right: 10,
              width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
              border: '1px solid var(--line)', background: 'rgba(255,255,255,.94)',
              font: 'inherit', fontSize: 16, lineHeight: 1, color: 'var(--ink)',
            }}>×</button>
        </div>
      )}

      {error && <p className="err">{error}</p>}

      <div className="row" style={{ gap: 10 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Posting…' : 'Post'}
        </button>

        <label className="btn btn-out" style={{ cursor: 'pointer' }}>
          {fileName ? 'Change photo' : 'Add a photo'}
          <input ref={fileRef} type="file" name="photo" hidden
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return clearPhoto();
              if (file.size > 8_000_000) {
                setError('Photos must be under 8MB.');
                clearPhoto();
                return;
              }
              setError(null);
              if (preview) URL.revokeObjectURL(preview);
              setPreview(URL.createObjectURL(file));
              setFileName(file.name);
            }} />
        </label>

        {fileName && (
          <span className="mute small" style={{
            maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{fileName}</span>
        )}
      </div>
    </form>
  );
}
