'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPost } from '@/app/actions/feed';
import { EmojiPicker } from '@/components/EmojiPicker';
import { shrinkImage } from '@/lib/shrinkImage';

export function PostForm() {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const clearPhoto = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFileName(null);
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <form ref={ref} className="surf" style={{ padding: 20 }}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        start(async () => {
          const fd = new FormData(form);

          // A phone photo is megabytes; the feed needs none of that. Shrinking
          // here is the single biggest saving in posting.
          if (file) {
            setStage('Preparing photo…');
            fd.set('photo', await shrinkImage(file));
          }

          setStage('Posting…');
          try {
            const res = await createPost(fd);
            if (res?.error) setError(res.error);
            else {
              setError(null);
              form.reset();
              clearPhoto();
              router.refresh();
            }
          } catch {
            setError('That took too long to confirm. Refreshing to check whether it posted…');
            router.refresh();
          } finally {
            setStage(null);
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
            style={{
              display: 'block', width: '100%', height: 'auto',
              maxHeight: 420, objectFit: 'contain',
            }} />
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
          {pending ? (stage ?? 'Posting…') : 'Post'}
        </button>

        <EmojiPicker targetName="body" />

        <label className="btn btn-out" style={{ cursor: 'pointer' }}>
          {fileName ? 'Change photo' : 'Add a photo'}
          <input ref={fileRef} type="file" name="photo" hidden
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              const chosen = e.target.files?.[0];
              if (!chosen) return clearPhoto();
              if (chosen.size > 8_000_000) {
                setError('Photos must be under 8MB.');
                clearPhoto();
                return;
              }
              setError(null);
              if (preview) URL.revokeObjectURL(preview);
              setPreview(URL.createObjectURL(chosen));
              setFileName(chosen.name);
              setFile(chosen);
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
