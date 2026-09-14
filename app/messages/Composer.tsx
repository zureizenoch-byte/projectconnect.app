'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sendMessage } from '@/app/actions/messages';
import { EmojiPicker } from '@/components/EmojiPicker';

export function Composer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const clearPhoto = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = (form: HTMLFormElement) => {
    const fd = new FormData(form);
    start(async () => {
      try {
        const res = await sendMessage(fd);
        if (res?.error) setError(res.error);
        else { setError(null); form.reset(); clearPhoto(); router.refresh(); }
      } catch {
        // A timeout usually means the message was saved and the reply never
        // arrived. Reload rather than claim it failed.
        setError('That took too long to confirm. Refreshing to check whether it sent…');
        router.refresh();
      }
    });
  };

  return (
    <form ref={ref} id="composer" className="surf"
      style={{ padding: 16, marginTop: 18, position: 'sticky', bottom: 16 }}
      onSubmit={(e) => { e.preventDefault(); submit(e.currentTarget); }}>

      <input type="hidden" name="conversation_id" value={conversationId} />

      {preview && (
        <div style={{
          position: 'relative', marginBottom: 12, borderRadius: 12,
          overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--gold-100)',
        }}>
          <img src={preview} alt=""
            style={{
              display: 'block', width: '100%', height: 'auto',
              maxHeight: 240, objectFit: 'contain',
            }} />
          <button type="button" onClick={clearPhoto} aria-label="Remove photo"
            style={{
              position: 'absolute', top: 8, right: 8,
              width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
              border: '1px solid var(--line)', background: 'rgba(255,255,255,.94)',
              font: 'inherit', fontSize: 15, lineHeight: 1, color: 'var(--ink)',
            }}>×</button>
        </div>
      )}

      <textarea name="body" rows={3} maxLength={4000}
        placeholder={preview ? 'Add a note, or send the photo on its own…' : 'Write a message…'}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            submit(e.currentTarget.form!);
          }
        }}
        style={{
          width: '100%', padding: '11px 14px', font: 'inherit', fontSize: 15.5,
          border: '1px solid var(--line)', borderRadius: 12, resize: 'vertical',
        }} />

      {error && <p className="err">{error}</p>}

      <div className="row" style={{ justifyContent: 'space-between', marginTop: 10, gap: 10 }}>
        <div className="row" style={{ gap: 10 }}>
          <EmojiPicker targetName="body" />
          <label className="btn btn-out"
            style={{ cursor: 'pointer', minHeight: 42, padding: '0 16px', fontSize: 14 }}>
            {preview ? 'Change photo' : 'Photo'}
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
              }} />
          </label>
          <span className="mute small">Ctrl+Enter to send</span>
        </div>

        <button className="btn btn-primary" type="submit" disabled={pending}
          style={{ minHeight: 42, padding: '0 22px' }}>
          {pending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  );
}
