'use client';
import { useState, useTransition } from 'react';
import { applyForAccess } from '@/app/actions/profile';
import { canApplyForLead } from '@/lib/permissions';
import type { Profile } from '@/lib/types';

export function AccessRequestForm({
  profile, paid, requests,
}: { profile: Profile; paid: boolean; requests: { id: string; kind: string; status: string }[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const open = (kind: string) => requests.find((r) => r.kind === kind && r.status === 'pending');
  const leadAllowed = canApplyForLead(profile, paid);

  return (
    <div className="surf" style={{ padding: 'clamp(22px,3vw,34px)', marginTop: 22 }}>
      <h2 style={{ fontSize: 24 }}>Roles and access</h2>
      <p className="mute small" style={{ marginTop: 6 }}>
        Speaker and Chapter Lead access is granted by an admin. You keep your member account either way.
      </p>

      <div className="grid g2" style={{ marginTop: 20 }}>
        <RequestCard
          title="Host Speaker Series talks"
          note="An admin reviews speaker accounts before you can publish a talk."
          kind="speaker"
          disabled={profile.speaker_approved || !!open('speaker')}
          state={profile.speaker_approved ? 'Approved' : open('speaker') ? 'Pending review' : null}
          pending={pending} start={start} setMsg={setMsg}
        />
        <RequestCard
          title="Lead a chapter"
          note={leadAllowed
            ? 'Chapter Leads run the meetup calendar, seating and check-in.'
            : 'Chapter Lead applications are open to paid members.'}
          kind="chapter_lead"
          disabled={!leadAllowed || !!open('chapter_lead') || !!profile.lead_chapter_id}
          state={profile.lead_chapter_id ? 'Active' : open('chapter_lead') ? 'Pending review' : null}
          pending={pending} start={start} setMsg={setMsg}
        />
      </div>
      {msg && <p className="hint" style={{ color: msg.startsWith('Request') ? 'var(--ok)' : 'var(--err)' }}>{msg}</p>}
    </div>
  );
}

function RequestCard({ title, note, kind, disabled, state, pending, start, setMsg }: any) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}>
      <strong>{title}</strong>
      <p className="small mute" style={{ marginTop: 6 }}>{note}</p>
      {state ? (
        <span className={'pill ' + (state === 'Approved' || state === 'Active' ? 'pill-ok' : 'pill-wait')}>{state}</span>
      ) : (
        <form onSubmit={(e: any) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const res = await applyForAccess(fd);
            setMsg(res?.error ?? 'Request sent to the admin team.');
          });
        }}>
          <input type="hidden" name="kind" value={kind} />
          <label className="fld" style={{ marginTop: 12 }}>
            <span>Why you (optional)</span>
            <textarea name="note" rows={3} />
          </label>
          <button className="btn btn-out" type="submit" disabled={disabled || pending}>Apply</button>
        </form>
      )}
    </div>
  );
}
