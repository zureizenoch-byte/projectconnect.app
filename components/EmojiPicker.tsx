'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A small emoji picker that types into the field beside it.
 *
 * No library and no font download: these are the characters people actually
 * reach for, grouped the way they think of them. Inserting at the caret rather
 * than appending, so an emoji can land mid-sentence.
 */

const GROUPS: [string, string[]][] = [
  ['Faces', [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '😘', '😗', '😚', '😋', '😛',
    '🤪', '🤨', '🧐', '🤓', '😎', '🥳', '😏', '😒', '😔', '😞',
    '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭',
    '😤', '😠', '😡', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰',
    '🤔', '🤗', '🤭', '🤫', '😴', '🤤', '😬', '🙄', '😯', '😮',
  ]],
  ['Gestures', [
    '👍', '👎', '👏', '🙌', '🙏', '🤝', '👌', '🤌', '✌️', '🤞',
    '🤟', '🤙', '👋', '🖐️', '✋', '👊', '✊', '💪', '🫡', '🫶',
    '👀', '🧠', '🫂', '🚶', '🏃', '💁', '🙋', '🤷', '🤦', '💃',
  ]],
  ['Work', [
    '📊', '📈', '📉', '🗓️', '📅', '⏰', '⏳', '📌', '📍', '📎',
    '🗂️', '📁', '📋', '📝', '✏️', '🖊️', '📖', '📚', '💼', '🧰',
    '🔧', '⚙️', '🛠️', '🔍', '🔎', '💡', '🧩', '🚀', '🎯', '🏁',
    '✅', '☑️', '❌', '⚠️', '🚧', '🔒', '🔑', '💰', '🧾', '🏆',
  ]],
  ['Coffee', [
    '☕', '🍵', '🥤', '🧋', '🍰', '🥐', '🍪', '🥯', '🍩', '🥗',
    '🍽️', '🥂', '🍻', '🎂', '🧁', '🍫', '🍯', '🥛', '🫖', '🍮',
  ]],
  ['Places', [
    '🏢', '🏙️', '🌆', '🌉', '🏠', '🗺️', '🧭', '✈️', '🚗', '🚌',
    '🚊', '🚶', '🌧️', '☀️', '⛅', '🌙', '🍁', '🌲', '🌊', '🏔️',
  ]],
  ['Hearts', [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '✨', '⭐', '🌟',
    '🔥', '💯', '🎉', '🎊', '🙌', '👑', '🌈', '☘️', '🍀', '💫',
  ]],
];

const RECENT_KEY = 'pc-recent-emoji';

export function EmojiPicker({ targetName, formId, onPick, size = 42 }: {
  /** name of the textarea to type into */
  targetName?: string;
  /** optional id of the form holding it, when the button sits outside */
  formId?: string;
  /** for a React-controlled field, which cannot be written to directly */
  onPick?: (emoji: string) => void;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [drop, setDrop] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_KEY);
      if (saved) setRecent(JSON.parse(saved).slice(0, 18));
    } catch {}
  }, []);

  // Opening upward is nicer beside a composer, but on a short screen the panel
  // runs off the top and its category tabs become unreachable. Measure first.
  useEffect(() => {
    if (!open) return;
    const box = wrapRef.current?.getBoundingClientRect();
    if (box) setDrop(box.top < 360);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const remember = (emoji: string) => {
    const next = [emoji, ...recent.filter((x) => x !== emoji)].slice(0, 18);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  };

  const insert = (emoji: string) => {
    if (onPick) { onPick(emoji); remember(emoji); return; }

    const root: ParentNode | Document = formId
      ? (document.getElementById(formId) ?? document)
      : (wrapRef.current?.closest('form') ?? document);
    const field = root.querySelector<HTMLTextAreaElement | HTMLInputElement>(
      '[name="' + (targetName ?? 'body') + '"]');
    if (!field) return;

    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? field.value.length;
    field.value = field.value.slice(0, start) + emoji + field.value.slice(end);

    // React needs to hear about a value it did not set
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.focus();
    const caret = start + emoji.length;
    field.setSelectionRange(caret, caret);
    remember(emoji);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        aria-expanded={open} aria-label="Insert an emoji" title="Emoji"
        className="btn btn-out"
        style={{ minHeight: size, padding: '0 14px', fontSize: 18, lineHeight: 1 }}>
        <span aria-hidden>🙂</span>
      </button>

      {open && (
        <div role="dialog" aria-label="Emoji"
          style={{
            position: 'absolute', left: 0, zIndex: 40,
            ...(drop ? { top: 'calc(100% + 10px)' } : { bottom: 'calc(100% + 10px)' }),
            width: 'min(340px, calc(100vw - 32px))',
            maxWidth: 'calc(100vw - 32px)',
            background: '#fff', border: '1px solid var(--line)',
            borderRadius: 16, boxShadow: 'var(--sh-lg)', padding: 12,
            display: 'flex', flexDirection: 'column',
            maxHeight: 'min(60vh, 380px)',
          }}>

          <div style={{
            display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 10,
            borderBottom: '1px solid var(--line)', marginBottom: 10,
            flex: 'none', scrollbarWidth: 'thin',
          }}>
            {recent.length > 0 && (
              <button type="button" onClick={() => setGroup(-1)}
                style={tabStyle(group === -1)}>Recent</button>
            )}
            {GROUPS.map(([label], i) => (
              <button key={label} type="button" onClick={() => setGroup(i)}
                style={tabStyle(group === i)}>{label}</button>
            ))}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))',
            gap: 2, overflowY: 'auto', flex: 1, minHeight: 0,
            WebkitOverflowScrolling: 'touch',
          }}>
            {(group === -1 ? recent : GROUPS[group][1]).map((emoji, i) => (
              <button key={emoji + i} type="button" onClick={() => insert(emoji)}
                aria-label={emoji}
                style={{
                  cursor: 'pointer', border: 0, background: 'transparent',
                  borderRadius: 8, padding: 0, height: 40,
                  fontSize: 23, lineHeight: 1,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gold-100)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    cursor: 'pointer', whiteSpace: 'nowrap', borderRadius: 999,
    padding: '5px 11px', font: 'inherit', fontSize: 13,
    border: '1px solid ' + (active ? 'var(--gold)' : 'transparent'),
    background: active ? 'var(--gold-100)' : 'transparent',
    color: active ? 'var(--gold-700)' : 'var(--mute)',
  };
}
