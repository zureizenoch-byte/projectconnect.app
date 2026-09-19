'use client';

/**
 * Bold, italic, underline and lists for a plain textarea.
 *
 * Deliberately not a contenteditable editor: the field stays a real textarea,
 * so the emoji picker, photo attachment and Ctrl+Enter all keep working, and
 * what gets stored is still plain text. The buttons write markers that
 * RichText renders on the way out.
 *
 * The list buttons prefix whole lines rather than wrapping a selection, and
 * pressing Enter inside a list continues it — the behaviour people expect from
 * every other editor, and the thing that makes a list button worth having.
 */

const WRAPS = [
  { key: 'b', marker: '**', label: 'Bold', hint: 'Ctrl+B', glyph: 'B', render: { fontWeight: 700 } },
  { key: 'i', marker: '_', label: 'Italic', hint: 'Ctrl+I', glyph: 'I', render: { fontStyle: 'italic' as const } },
  { key: 'u', marker: '__', label: 'Underline', hint: 'Ctrl+U', glyph: 'U', render: { textDecoration: 'underline' as const } },
];

// Unicode's dash-punctuation category, plus the common bullet glyphs.
const DASH = '[\\p{Pd}*\\u2022\\u00b7\\u2023\\u25aa]';
const BULLET = new RegExp('^(\\s*)(' + DASH + ')\\s+', 'u');
const NUMBER = /^(\s*)(\d+)[.)]\s+/;

function fieldFor(name: string, from: HTMLElement | null) {
  const form = from?.closest('form');
  return (form?.querySelector('[name="' + name + '"]') as HTMLTextAreaElement | null) ?? null;
}

/** Write through the native setter so React notices the change. */
function setValue(field: HTMLTextAreaElement, next: string, from: number, to = from) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value',
  )?.set;
  setter ? setter.call(field, next) : (field.value = next);
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.focus();
  field.setSelectionRange(from, to);
}

const LIST_LEAD = new RegExp('^(\\s*(?:' + DASH + '|\\d+[.)])\\s+)?([\\s\\S]*)$', 'u');

function wrap(field: HTMLTextAreaElement, marker: string) {
  const { selectionStart: a, selectionEnd: b, value } = field;
  const chosen = value.slice(a, b);
  const before = value.slice(0, a);
  const after = value.slice(b);

  // Several lines at once: one pair per line, with any bullet or number left
  // outside it, so the list survives and every line actually renders bold.
  if (chosen.includes('\n')) {
    const marked = chosen.split('\n').map((line) => {
      const [, lead = '', body = ''] = line.match(LIST_LEAD) ?? [];
      if (!body.trim()) return line;
      const bare = body.startsWith(marker) && body.endsWith(marker) && body.length > marker.length * 2
        ? body.slice(marker.length, -marker.length)
        : null;
      return bare !== null ? lead + bare : lead + marker + body + marker;
    }).join('\n');

    setValue(field, before + marked + after, a, a + marked.length);
    return;
  }

  // pressing the same button again unwraps, rather than doubling up
  const already = before.endsWith(marker) && after.startsWith(marker);
  const next = already
    ? before.slice(0, -marker.length) + chosen + after.slice(marker.length)
    : before + marker + chosen + marker + after;

  const caret = already ? a - marker.length : a + marker.length;
  setValue(field, next, caret, caret + chosen.length);
}

/** Prefix every line the selection touches — or the current line if none. */
function listify(field: HTMLTextAreaElement, kind: 'bullet' | 'number') {
  const { selectionStart: a, selectionEnd: b, value } = field;

  const from = value.lastIndexOf('\n', a - 1) + 1;
  const lineEnd = value.indexOf('\n', b);
  const to = lineEnd === -1 ? value.length : lineEnd;

  const lines = value.slice(from, to).split('\n');
  const test = kind === 'bullet' ? BULLET : NUMBER;
  const allMarked = lines.every((l) => !l.trim() || test.test(l));

  const rewritten = lines.map((line, i) => {
    const bare = line.replace(BULLET, '$1').replace(NUMBER, '$1');
    if (allMarked) return bare;                       // pressing again removes it
    if (!bare.trim()) return bare;
    return kind === 'bullet' ? '- ' + bare : (i + 1) + '. ' + bare;
  });

  const block = rewritten.join('\n');
  const next = value.slice(0, from) + block + value.slice(to);
  setValue(field, next, from, from + block.length);
}

/** Enter inside a list continues it; Enter on an empty item ends it. */
function continueList(e: React.KeyboardEvent<HTMLElement>, field: HTMLTextAreaElement) {
  if (e.key !== 'Enter' || e.shiftKey || e.metaKey || e.ctrlKey) return;

  const { selectionStart: caret, value } = field;
  const from = value.lastIndexOf('\n', caret - 1) + 1;
  const line = value.slice(from, caret);

  const bullet = line.match(BULLET);
  const numbered = line.match(NUMBER);
  if (!bullet && !numbered) return;

  const marker = bullet ? bullet[0] : numbered![0];
  const content = line.slice(marker.length);

  e.preventDefault();

  // an empty item means "I'm done" — clear it rather than adding another
  if (!content.trim()) {
    const next = value.slice(0, from) + value.slice(caret);
    setValue(field, next, from);
    return;
  }

  const lead = bullet
    ? bullet[1] + '- '
    : numbered![1] + (Number(numbered![2]) + 1) + '. ';

  const next = value.slice(0, caret) + '\n' + lead + value.slice(caret);
  setValue(field, next, caret + 1 + lead.length);
}

export function FormatBar({ targetName = 'body' }: { targetName?: string }) {
  const swatch = {
    width: 34, height: 34, display: 'grid', placeItems: 'center',
    borderRadius: 8, cursor: 'pointer', font: 'inherit', fontSize: 15,
    border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)',
  } as const;

  return (
    <div className="row" style={{ gap: 4, marginBottom: 8 }}
      onKeyDownCapture={(e) => {
        const field = fieldFor(targetName, e.currentTarget as HTMLElement);
        if (!field) return;

        if (e.metaKey || e.ctrlKey) {
          const mark = WRAPS.find((m) => m.key === e.key.toLowerCase());
          if (mark) { e.preventDefault(); wrap(field, mark.marker); }
          return;
        }
        continueList(e, field);
      }}>

      {WRAPS.map((m) => (
        <button key={m.key} type="button" aria-label={m.label} title={m.label + ' · ' + m.hint}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            const field = fieldFor(targetName, e.currentTarget);
            if (field) wrap(field, m.marker);
          }}
          style={{ ...swatch, ...m.render }}>{m.glyph}</button>
      ))}

      <span aria-hidden style={{
        width: 1, height: 20, background: 'var(--line)', margin: '0 4px',
      }} />

      <button type="button" aria-label="Bulleted list" title="Bulleted list"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          const field = fieldFor(targetName, e.currentTarget);
          if (field) listify(field, 'bullet');
        }}
        style={swatch}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round">
          <path d="M8 6h13M8 12h13M8 18h13" />
          <circle cx="3.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="3.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="3.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      </button>

      <button type="button" aria-label="Numbered list" title="Numbered list"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          const field = fieldFor(targetName, e.currentTarget);
          if (field) listify(field, 'number');
        }}
        style={swatch}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6h12M9 12h12M9 18h12" />
          <path d="M3 8V4l-1 .7M2.2 20h2.4M2.2 20c0-1 2.4-1.4 2.4-2.6 0-.6-.5-1-1.2-1-.6 0-1.1.3-1.2.9" />
        </svg>
      </button>

      <span className="mute" style={{ fontSize: 12.5, marginLeft: 6 }}>
        Enter continues a list
      </span>
    </div>
  );
}
