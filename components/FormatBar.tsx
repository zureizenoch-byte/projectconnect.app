'use client';

/**
 * Bold, italic and underline for a plain textarea.
 *
 * Deliberately not a contenteditable editor: the field stays a real textarea,
 * so the emoji picker, photo attachment, autosave and Ctrl+Enter all keep
 * working, and what gets stored is still plain text. The buttons wrap the
 * selection in markers that RichText renders on the way out.
 *
 * Pressing a button with nothing selected inserts the pair and puts the caret
 * between them, so you can type into the formatting rather than having to
 * write first and select after.
 */

const MARKS = [
  { key: 'b', marker: '**', label: 'Bold', hint: 'Ctrl+B', render: { fontWeight: 700 } },
  { key: 'i', marker: '_', label: 'Italic', hint: 'Ctrl+I', render: { fontStyle: 'italic' as const } },
  { key: 'u', marker: '__', label: 'Underline', hint: 'Ctrl+U', render: { textDecoration: 'underline' as const } },
];

function fieldFor(name: string, from: HTMLElement | null) {
  const form = from?.closest('form');
  return (form?.querySelector('[name="' + name + '"]') as HTMLTextAreaElement | null) ?? null;
}

function wrap(field: HTMLTextAreaElement, marker: string) {
  const { selectionStart: a, selectionEnd: b, value } = field;
  const chosen = value.slice(a, b);
  const before = value.slice(0, a);
  const after = value.slice(b);

  // pressing the same button again unwraps, rather than doubling up
  const already = before.endsWith(marker) && after.startsWith(marker);
  const next = already
    ? before.slice(0, -marker.length) + chosen + after.slice(marker.length)
    : before + marker + chosen + marker + after;

  const caret = already ? a - marker.length : a + marker.length;

  // assign through the native setter so React notices the change
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value',
  )?.set;
  setter ? setter.call(field, next) : (field.value = next);
  field.dispatchEvent(new Event('input', { bubbles: true }));

  field.focus();
  field.setSelectionRange(caret, caret + chosen.length);
}

export function FormatBar({ targetName = 'body' }: { targetName?: string }) {
  return (
    <div className="row" style={{ gap: 4, marginBottom: 8 }}
      onKeyDownCapture={(e) => {
        if (!(e.metaKey || e.ctrlKey)) return;
        const mark = MARKS.find((m) => m.key === e.key.toLowerCase());
        if (!mark) return;
        const field = fieldFor(targetName, e.currentTarget as HTMLElement);
        if (!field) return;
        e.preventDefault();
        wrap(field, mark.marker);
      }}>
      {MARKS.map((m) => (
        <button key={m.key} type="button" aria-label={m.label} title={m.label + ' · ' + m.hint}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            const field = fieldFor(targetName, e.currentTarget);
            if (field) wrap(field, m.marker);
          }}
          style={{
            width: 34, height: 34, display: 'grid', placeItems: 'center',
            borderRadius: 8, cursor: 'pointer', font: 'inherit', fontSize: 15,
            border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)',
            ...m.render,
          }}>
          {m.label[0]}
        </button>
      ))}
      <span className="mute" style={{ fontSize: 12.5, marginLeft: 4 }}>
        Select text, or type between the marks
      </span>
    </div>
  );
}
