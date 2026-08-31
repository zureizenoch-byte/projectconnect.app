'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { blockMember, unblockMember, reportMessage } from '@/app/actions/messages';

const REASONS: [string, string][] = [
  ['spam', 'Spam or unsolicited selling'],
  ['harassment', 'Harassment or abuse'],
  ['inappropriate', 'Inappropriate content'],
  ['impersonation', 'Impersonation'],
  ['other', 'Something else'],
];

export function ThreadActions({
  conversationId, otherId, otherName, iBlocked,
}: { conversationId: string; otherId: string; otherName: string; iBlocked: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<'none' | 'report'>('none');
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div style={{ position: 'relative' }}>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn btn-quiet" disabled={pending}
          style={{ minHeight: 36, padding: '0 12px', fontSize: 13.5 }}
          onClick={() => setOpen(open === 'report' ? 'none' : 'report')}>Report</button>

        {iBlocked ? (
          <button className="btn btn-out" disabled={pending}
            style={{ minHeight: 36, padding: '0 12px', fontSize: 13.5 }}
            onClick={() => start(async () => {
              const res = await unblockMember(otherId);
              setMsg(res?.error ?? res?.ok ?? null);
              router.refresh();
            })}>Unblock</button>
        ) : (
          <button className="btn btn-out" disabled={pending}
            style={{ minHeight: 36, padding: '0 12px', fontSize: 13.5, color: 'var(--err)', borderColor: 'rgba(180,35,24,.35)' }}
            onClick={() => {
              if (!confirm('Block ' + otherName + '? They will not be able to message you.')) return;
              const fd = new FormData();
              fd.set('blocked_id', otherId);
              start(async () => {
                const res = await blockMember(fd);
                setMsg(res?.error ?? res?.ok ?? null);
                router.refresh();
              });
            }}>Block</button>
        )}
      </div>

      {open === 'report' && (
        <div className="surf" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 30,
          width: 320, padding: 18, boxShadow: 'var(--sh-lg)',
        }}>
          <form onSubmit={(e: any) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await reportMessage(fd);
              setMsg(res?.error ?? res?.ok ?? null);
              if (!res?.error) { setOpen('none'); router.refresh(); }
            });
          }}>
            <p className="eyebrow">Report this conversation</p>
            <input type="hidden" name="conversation_id" value={conversationId} />
            <input type="hidden" name="reported_id" value={otherId} />
            <label className="fld" style={{ marginTop: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 15 }}>Reason</span>
              <select name="reason" defaultValue="spam">
                {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="fld" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 15 }}>Details (optional)</span>
              <textarea name="detail" rows={3} />
            </label>
            <label className="row" style={{ gap: 8, marginBottom: 14 }}>
              <input type="checkbox" name="also_block" defaultChecked />
              <span className="small">Also block this member</span>
            </label>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-primary" type="submit" disabled={pending}
                style={{ minHeight: 38, padding: '0 16px', fontSize: 14 }}>Send report</button>
              <button className="btn btn-quiet" type="button" onClick={() => setOpen('none')}
                style={{ minHeight: 38, padding: '0 12px', fontSize: 14 }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {msg && <p className="hint" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', width: 260 }}>{msg}</p>}
    </div>
  );
}
