'use client';
import { useState, useTransition } from 'react';
import { applyForAccess, updateAccessRequest, withdrawAccessRequest } from '@/app/actions/profile';
import { canApplyForLead } from '@/lib/permissions';
import type { Profile } from '@/lib/types';

type Request = { id: string; kind: string; status: string; note: string | null; created_at: string; decided_at?: string | null };

export function AccessRequestForm({
  profile, paid, requests,
}: { profile: Profile; paid: boolean; requests: Request[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const leadAllowed = canApplyForLead(profile, paid);

  const latest = (kind: string) =>
    requests
      .filter((r) => r.kind === kind)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];

  return (
    <div className="surf" style={{ padding: 'clamp(22px,3vw,34px)', marginTop: 22 }}>
      <h2 style={{ fontSize: 24 }}>Roles and access</h2>
      <p className="mute small" style={{ marginTop: 6 }}>
        Speaker and Chapter Lead access is granted by an admin. You keep your member account either way.
      </p>

      <div className="grid g2" style={{ marginTop: 20 }}>
        <AccessCard
          title="Host Speaker Series talks"
          note="An admin reviews speaker applications before you can publish a talk."
          kind="speaker"
          request={latest('speaker')}
          granted={profile.speaker_approved}
          grantedLabel="Approved"
          allowed
          pending={pending} start={start} setMsg={setMsg}
        />
        <AccessCard
          title="Lead a chapter"
          note={leadAllowed
            ? 'Chapter Leads run the meetup calendar, seating and check-in.'
            : 'Chapter Lead applications are open to paid members.'}
          kind="chapter_lead"
          request={latest('chapter_lead')}
          granted={!!profile.lead_chapter_id}
          grantedLabel="Active"
          allowed={leadAllowed}
          pending={pending} start={start} setMsg={setMsg}
        />
      </div>
      {msg && <p className="hint" style={{ color: msg.startsWith('Application') || msg.startsWith('Saved') ? 'var(--ok)' : 'var(--err)' }}>{msg}</p>}
    </div>
  );
}

function AccessCard({ title, note, kind, request, granted, grantedLabel, allowed, pending, start, setMsg }: any) {
  const [editing, setEditing] = useState(false);
  const isPending = request?.status === 'pending';
  const wasRejected = request?.status === 'rejected';

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <strong>{title}</strong>
        {granted && <span className="pill pill-ok">{grantedLabel}</span>}
        {!granted && isPending && <span className="pill pill-wait">Under review</span>}
        {!granted && wasRejected && <span className="pill pill-off">Not approved</span>}
      </div>
      <p className="small mute" style={{ marginTop: 6 }}>{note}</p>

      {granted ? null : isPending ? (
        <div style={{ marginTop: 12 }}>
          <p className="small mute" style={{ margin: 0 }}>
            Applied {new Date(request.created_at).toLocaleDateString('en-CA', { dateStyle: 'medium' })}
          </p>

          {editing ? (
            <form onSubmit={(e: any) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                const res = await updateAccessRequest(fd);
                setMsg(res?.error ?? 'Saved — your admin sees the update.');
                if (!res?.error) setEditing(false);
              });
            }}>
              <input type="hidden" name="id" value={request.id} />
              <label className="fld" style={{ marginTop: 10, marginBottom: 12 }}>
                <span>Your application</span>
                <textarea name="note" rows={4} defaultValue={request.note ?? ''}
                  placeholder="What you'd speak on, and the experience behind it." />
              </label>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-primary" type="submit" disabled={pending}
                  style={{ minHeight: 38, padding: '0 16px', fontSize: 14 }}>Save changes</button>
                <button className="btn btn-quiet" type="button" onClick={() => setEditing(false)}
                  style={{ minHeight: 38, padding: '0 14px', fontSize: 14 }}>Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <blockquote style={{
                margin: '10px 0 0', padding: '12px 14px', borderRadius: 10,
                background: 'var(--gold-100)', border: '1px solid var(--gold-200)',
                fontSize: 14.5, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              }}>
                {request.note?.trim() ? request.note : <span className="mute">No details added yet.</span>}
              </blockquote>
              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <button className="btn btn-out" onClick={() => setEditing(true)} disabled={pending}
                  style={{ minHeight: 38, padding: '0 16px', fontSize: 14 }}>Amend application</button>
                <button className="btn btn-quiet" disabled={pending}
                  style={{ minHeight: 38, padding: '0 14px', fontSize: 14 }}
                  onClick={() => {
                    if (!confirm('Withdraw this application?')) return;
                    start(async () => {
                      const res = await withdrawAccessRequest(request.id);
                      setMsg(res?.error ?? 'Application withdrawn.');
                    });
                  }}>Withdraw</button>
              </div>
            </>
          )}
        </div>
      ) : (
        <form onSubmit={(e: any) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const res = await applyForAccess(fd);
            setMsg(res?.error ?? 'Application sent to the admin team.');
          });
        }}>
          <input type="hidden" name="kind" value={kind} />
          <label className="fld" style={{ marginTop: 12, marginBottom: 12 }}>
            <span>{wasRejected ? 'Apply again' : 'Why you (optional)'}</span>
            <textarea name="note" rows={3} defaultValue={wasRejected ? (request.note ?? '') : ''} />
          </label>
          <button className="btn btn-out" type="submit" disabled={!allowed || pending}
            style={{ minHeight: 38, padding: '0 16px', fontSize: 14 }}>
            {wasRejected ? 'Reapply' : 'Apply'}
          </button>
        </form>
      )}
    </div>
  );
}
