'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A small emoji picker that types into the field beside it.
 *
 * No library and no font download: these are the characters people actually
 * reach for, grouped the way they think of them. Inserting at the caret rather
 * than appending, so an emoji can land mid-sentence.
 *
 * On a phone it opens as a bottom sheet rather than a popover. A panel anchored
 * to a button halfway across a narrow screen either overflows the edge or gets
 * clipped by the card it sits in; a sheet pinned to the viewport cannot.
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
  const [sheet, setSheet] = useState(false);
  const [drop, setDrop] = useState(false);
  const [shift, setShift] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_KEY);
      if (saved) setRecent(JSON.parse(saved).slice(0, 18));
    } catch {}
  }, []);

  // Narrow screens get the sheet. Watched rather than read once, so a rotation
  // does not leave a popover stranded off the edge.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const read = () => setSheet(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  // Popover placement: down when there is no room above, and nudged left when
  // the panel would run past the right edge.
  useEffect(() => {
    if (!open || sheet) return;
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    setDrop(box.top < 360);

    const width = panelRef.current?.offsetWidth ?? 340;
    const overflow = box.left + width + 16 - window.innerWidth;
    setShift(overflow > 0 ? -overflow : 0);
  }, [open, sheet, group]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)
        && !panelRef.current?.contains(e.target as Node)) setOpen(false);
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

  const panel: React.CSSProperties = sheet
    ? {
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 60,
        width: '100%', maxWidth: '100%',
        borderRadius: '20px 20px 0 0',
        borderTop: '1px solid var(--line)',
        paddingBottom: 'calc(14px + env(safe-area-inset-bottom))',
        maxHeight: '56vh',
      }
    : {
        position: 'absolute', left: shift, zIndex: 40,
        ...(drop ? { top: 'calc(100% + 10px)' } : { bottom: 'calc(100% + 10px)' }),
        width: 'min(340px, calc(100vw - 32px))',
        borderRadius: 16,
        border: '1px solid var(--line)',
        maxHeight: 'min(60vh, 380px)',
      };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        aria-expanded={open} aria-label="Insert an emoji" title="Emoji"
        className="btn btn-out"
        style={{ minHeight: size, padding: '0 14px', fontSize: 18, lineHeight: 1 }}>
        <span aria-hidden>🙂</span>
      </button>

      {open && sheet && (
        <div onClick={() => setOpen(false)} aria-hidden
          style={{
            position: 'fixed', inset: 0, zIndex: 55,
            background: 'rgba(13,19,48,.32)',
          }} />
      )}

      {open && (
        <div ref={panelRef} role="dialog" aria-label="Emoji"
          style={{
            background: '#fff', boxShadow: 'var(--sh-lg)', padding: 14,
            display: 'flex', flexDirection: 'column',
            ...panel,
          }}>

          {sheet && (
            <div className="row" style={{
              justifyContent: 'space-between', flex: 'none', marginBottom: 10,
            }}>
              <span style={{
                fontSize: 12.5, fontWeight: 600, letterSpacing: '.09em',
                textTransform: 'uppercase', color: 'var(--gold-700)',
              }}>Emoji</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"
                style={{
                  cursor: 'pointer', border: '1px solid var(--line)', background: '#fff',
                  width: 34, height: 34, borderRadius: '50%',
                  font: 'inherit', fontSize: 17, lineHeight: 1, color: 'var(--ink)',
                }}>×</button>
            </div>
          )}

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
            display: 'grid',
            gridTemplateColumns: sheet
              ? 'repeat(auto-fill, minmax(44px, 1fr))'
              : 'repeat(auto-fill, minmax(38px, 1fr))',
            gap: 2, overflowY: 'auto', flex: 1, minHeight: 0,
            WebkitOverflowScrolling: 'touch',
          }}>
            {(group === -1 ? recent : GROUPS[group][1]).map((emoji, i) => (
              <button key={emoji + i} type="button" onClick={() => insert(emoji)}
                aria-label={emoji}
                style={{
                  cursor: 'pointer', border: 0, background: 'transparent',
                  borderRadius: 8, padding: 0, height: sheet ? 46 : 40,
                  fontSize: sheet ? 26 : 23, lineHeight: 1,
                  WebkitTouchCallout: 'none', touchAction: 'manipulation',
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
    padding: '6px 12px', font: 'inherit', fontSize: 13.5,
    border: '1px solid ' + (active ? 'var(--gold)' : 'transparent'),
    background: active ? 'var(--gold-100)' : 'transparent',
    color: active ? 'var(--gold-700)' : 'var(--mute)',
  };
}
