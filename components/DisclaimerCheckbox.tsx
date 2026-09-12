'use client';

import { useState } from 'react';
import {
  DISCLAIMER_TITLE, DISCLAIMER_DRAFT_NOTE, DISCLAIMER_INTRO, DISCLAIMER_SECTIONS,
} from '@/lib/disclaimer';

/**
 * The disclaimer at signup. Collapsed to a single line by default so the form
 * stays a form, expandable in place — nobody should have to leave a half-filled
 * signup to read it.
 */
export function DisclaimerCheckbox({ name = 'disclaimer' }: { name?: string }) {
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);

  return (
    <div style={{
      marginBottom: 22, border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden',
    }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          padding: '14px 16px', border: 0, background: '#fcfcff',
          font: 'inherit', fontSize: 15, color: 'var(--ink)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
        <span style={{ fontWeight: 600 }}>{DISCLAIMER_TITLE}</span>
        <span className="mute small" style={{ marginLeft: 'auto' }}>
          {open ? 'Hide' : 'Read it'}
        </span>
        <span aria-hidden className="mute" style={{
          transition: 'transform .18s ease',
          transform: open ? 'rotate(180deg)' : 'none',
        }}>▾</span>
      </button>

      {open && (
        <div style={{
          maxHeight: 320, overflowY: 'auto', padding: '16px 18px',
          borderTop: '1px solid var(--line)', background: '#fff',
        }}>
          <p style={{
            margin: '0 0 14px', padding: '10px 12px', borderRadius: 10, fontSize: 13.5,
            lineHeight: 1.6, background: 'var(--gold-100)', border: '1px solid var(--gold-200)',
            color: 'var(--gold-700)',
          }}>{DISCLAIMER_DRAFT_NOTE}</p>

          <p style={{ margin: '0 0 16px', fontSize: 14.5, lineHeight: 1.7 }}>{DISCLAIMER_INTRO}</p>

          {DISCLAIMER_SECTIONS.map((s) => (
            <section key={s.title} style={{ marginBottom: 18 }}>
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>{s.title}</h3>
              {s.paras?.map((p, i) => (
                <p key={i} style={{ margin: '0 0 8px', fontSize: 14.5, lineHeight: 1.7 }}>{p}</p>
              ))}
              {s.bullets && (
                <ul style={{ margin: '0 0 8px', paddingLeft: 20, fontSize: 14.5, lineHeight: 1.7 }}>
                  {s.bullets.map((b, i) => <li key={i} style={{ marginBottom: 4 }}>{b}</li>)}
                </ul>
              )}
              {s.tail?.map((p, i) => (
                <p key={i} style={{ margin: '0 0 8px', fontSize: 14.5, lineHeight: 1.7 }}>{p}</p>
              ))}
            </section>
          ))}
        </div>
      )}

      <label className="row" style={{
        alignItems: 'flex-start', gap: 10, padding: '14px 16px',
        borderTop: '1px solid var(--line)', cursor: 'pointer',
        background: agreed ? 'var(--gold-100)' : '#fff',
      }}>
        <input type="checkbox" name={name} required style={{ marginTop: 3 }}
          checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span style={{ fontSize: 15, lineHeight: 1.55 }}>
          I have read and agree to the Member Disclaimer & Limitation of Liability, including that
          Project Connect does not verify members and that attending meetups is at my own risk.
        </span>
      </label>
    </div>
  );
}
