'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sendMessage } from '@/app/actions/messages';

export function Composer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (form: HTMLFormElement) => {
    const fd = new FormData(form);
    start(async () => {
      const res = await sendMessage(fd);
      if (res?.error) setError(res.error);
      else { setError(null); form.reset(); router.refresh(); }
    });
  };

  return (
    <form ref={ref} className="surf" style={{ padding: 16, marginTop: 18, position: 'sticky', bottom: 16 }}
      onSubmit={(e) => { e.preventDefault(); submit(e.currentTarget); }}>
      <input type="hidden" name="conversation_id" value={conversationId} />
      <textarea name="body" required rows={3} maxLength={4000}
        placeholder="Write a message…"
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
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
        <span className="mute small">Ctrl+Enter to send</span>
        <button className="btn btn-primary" type="submit" disabled={pending}
          style={{ minHeight: 42, padding: '0 22px' }}>
          {pending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  );
}
