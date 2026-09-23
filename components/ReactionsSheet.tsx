'use client';

import { useEffect, useMemo, useState } from 'react';
import { ALL_REACTIONS } from '@/lib/reactions';
import { Avatar } from '@/components/Avatar';

export type Reactor = {
  id: string;
  reaction: string;
  name: string;
  photo: string | null;
  role_level: string | null;
};

/**
 * Who reacted, and how. Opens as a centred dialog on desktop and a bottom
 * sheet on phones, with a tab per reaction type — "All" first, then each
 * reaction in order of how many people chose it.
 */
export function ReactionsSheet({ reactors, onClose }: {
  reactors: Reactor[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<string>('all');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const groups = useMemo(() => {
    const byKey = new Map<string, Reactor[]>();
    for (const r of reactors) {
      if (!byKey.has(r.reaction)) byKey.set(r.reaction, []);
      byKey.get(r.reaction)!.push(r);
    }
    return [...byKey.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [reactors]);

  const emojiOf = (key: string) => ALL_REACTIONS.find((r) => r.key === key)?.emoji ?? '👍';
  const labelOf = (key: string) => ALL_REACTIONS.find((r) => r.key === key)?.label ?? 'Like';

  const list = tab === 'all' ? reactors : (groups.find(([k]) => k === tab)?.[1] ?? []);

  return (
    <div role="dialog" aria-modal="true" aria-label="Reactions" className="rx-backdrop"
      onClick={onClose}>
      <div className="rx-sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px 0',
        }}>
          <h3 style={{ fontSize: 20, margin: 0 }}>Reactions</h3>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{
              marginLeft: 'auto', width: 34, height: 34, borderRadius: '50%',
              border: '1px solid var(--line)', background: '#fff', cursor: 'pointer',
              font: 'inherit', fontSize: 17, lineHeight: 1, color: 'var(--ink)',
            }}>×</button>
        </div>

        <div role="tablist" style={{
          display: 'flex', gap: 4, overflowX: 'auto', padding: '12px 16px 0',
          borderBottom: '1px solid var(--line)', scrollbarWidth: 'none',
        }}>
          {[['all', 'All', reactors.length] as const,
            ...groups.map(([k, rs]) => [k, emojiOf(k), rs.length] as const)].map(([key, face, n]) => {
            const on = tab === key;
            return (
              <button key={key} role="tab" aria-selected={on} type="button"
                onClick={() => setTab(key)}
                aria-label={key === 'all' ? 'All reactions' : labelOf(key)}
                style={{
                  flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 12px 10px', cursor: 'pointer', font: 'inherit',
                  fontSize: 14.5, background: 'transparent', border: 0,
                  borderBottom: '2px solid ' + (on ? 'var(--gold)' : 'transparent'),
                  color: on ? 'var(--gold-700)' : 'var(--mute)',
                  fontWeight: on ? 600 : 500, marginBottom: -1,
                }}>
                <span style={{ fontSize: key === 'all' ? 14.5 : 18, lineHeight: 1 }}>{face}</span>
                <span>{n}</span>
              </button>
            );
          })}
        </div>

        <ul style={{
          listStyle: 'none', margin: 0, padding: '6px 8px 14px',
          overflowY: 'auto', flex: 1,
        }}>
          {list.map((r) => (
            <li key={r.id}>
              <a href={'/members/' + r.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px',
                borderRadius: 12, color: 'inherit', textDecoration: 'none',
              }} className="rx-row">
                <span style={{ position: 'relative', flex: 'none' }}>
                  <Avatar src={r.photo} name={r.name} size={44} />
                  <span aria-hidden style={{
                    position: 'absolute', right: -4, bottom: -4,
                    width: 22, height: 22, borderRadius: '50%', display: 'grid',
                    placeItems: 'center', background: '#fff',
                    border: '1px solid var(--line)', fontSize: 13, lineHeight: 1,
                  }}>{emojiOf(r.reaction)}</span>
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: 15.5 }}>{r.name}</span>
                  <span className="mute" style={{ display: 'block', fontSize: 13.5 }}>
                    {labelOf(r.reaction)}{r.role_level ? ' · ' + r.role_level : ''}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
