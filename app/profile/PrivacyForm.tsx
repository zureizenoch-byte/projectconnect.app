'use client';
import { useState, useTransition } from 'react';
import { savePrivacy } from '@/app/actions/profile';

const TOGGLES: [string, string, string][] = [
  ['visible_to_members', 'Visible to other members', 'Your profile appears to members you are matched with.'],
  ['allow_contact', 'Allow members to contact me', 'Chapter Leads can always reach you about logistics.'],
  ['show_employer', 'Show my current employer', 'Off keeps your employer hidden on your profile card.'],
  ['show_city', 'Show my city', 'Your chapter is always visible; this is the finer detail.'],
];

export function PrivacyForm({ settings }: { settings: Record<string, boolean> | null }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form className="surf" style={{ padding: 'clamp(22px,3vw,34px)', marginTop: 22 }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await savePrivacy(fd);
          setMsg(res?.error ?? 'Saved.');
        });
      }}>
      <h2 style={{ fontSize: 24 }}>Privacy</h2>
      <p className="mute small" style={{ marginTop: 6 }}>
        You control what other members see, and who may contact you about matched rooms.
      </p>
      <div className="grid" style={{ gap: 14, marginTop: 20 }}>
        {TOGGLES.map(([name, label, note]) => (
          <label key={name} className="row" style={{ alignItems: 'flex-start', gap: 12,
            border: '1px solid var(--line)', borderRadius: 12, padding: 14 }}>
            <input type="checkbox" name={name} defaultChecked={settings?.[name] ?? true} style={{ marginTop: 4 }} />
            <span>
              <strong>{label}</strong>
              <span className="small mute" style={{ display: 'block' }}>{note}</span>
            </span>
          </label>
        ))}
      </div>
      {msg && <p className="hint" style={{ color: msg === 'Saved.' ? 'var(--ok)' : 'var(--err)' }}>{msg}</p>}
      <button className="btn btn-primary" type="submit" disabled={pending} style={{ marginTop: 18 }}>
        {pending ? 'Saving…' : 'Save privacy settings'}
      </button>
      <p className="hint">
        Consent records for the <a href="/legal/privacy">Privacy Policy</a> and{' '}
        <a href="/legal/terms">Terms</a> are stored with the version you agreed to.
      </p>
    </form>
  );
}
