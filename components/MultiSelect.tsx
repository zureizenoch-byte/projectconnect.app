'use client';
import { useState, useRef, useEffect, useMemo } from 'react';

/**
 * A dropdown you pick from; picks collect as removable chips underneath.
 * Posts the same field names as ChipGroup, so the server action is unchanged.
 */
export function MultiSelect({
  category, label, options, initial = [], initialCustom = '', allowOther = true, placeholder,
}: {
  category: string;
  label: string;
  options: string[];
  initial?: string[];
  initialCustom?: string;
  allowOther?: boolean;
  placeholder?: string;
}) {
  const [picked, setPicked] = useState<string[]>(initial);
  const [custom, setCustom] = useState(initialCustom);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  const otherOn = picked.includes('Other') || custom.length > 0;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const available = useMemo(() => {
    const all = allowOther ? [...options, 'Other'] : options;
    const q = query.trim().toLowerCase();
    return all.filter((o) => !picked.includes(o) && (!q || o.toLowerCase().includes(q)));
  }, [options, picked, query, allowOther]);

  const add = (v: string) => {
    setPicked((p) => [...p, v]);
    setQuery('');
  };
  const remove = (v: string) => setPicked((p) => p.filter((x) => x !== v));

  return (
    <fieldset style={{ border: 0, padding: 0, margin: '0 0 26px' }}>
      <legend style={{ fontSize: 17.5, fontWeight: 600, marginBottom: 10 }}>{label}</legend>

      <div ref={boxRef} style={{ position: 'relative', maxWidth: 560 }}>
        <div
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); }
            if (e.key === 'Escape') setOpen(false);
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            minHeight: 46, padding: '10px 14px', cursor: 'pointer',
            background: '#fff', border: '1px solid ' + (open ? 'var(--gold)' : 'var(--line)'),
            borderRadius: 12, fontSize: 16,
            boxShadow: open ? '0 0 0 3px rgba(51,82,207,.18)' : undefined,
            transition: 'border-color .16s ease, box-shadow .16s ease',
          }}>
          <span className={picked.length ? undefined : 'mute'} style={{ flex: 1 }}>
            {picked.length
              ? picked.length + ' selected'
              : (placeholder ?? 'Select ' + label.toLowerCase())}
          </span>
          <span aria-hidden style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform .16s ease', color: 'var(--mute)', fontSize: 12,
          }}>▼</span>
        </div>

        {open && (
          <div style={{
            position: 'absolute', zIndex: 40, left: 0, right: 0, top: 'calc(100% + 6px)',
            background: '#fff', border: '1px solid var(--line)', borderRadius: 12,
            boxShadow: 'var(--sh-lg)', overflow: 'hidden',
          }}>
            <div style={{ padding: 10, borderBottom: '1px solid var(--line)' }}>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to filter…"
                style={{
                  width: '100%', minHeight: 38, padding: '8px 12px', font: 'inherit', fontSize: 15,
                  border: '1px solid var(--line)', borderRadius: 9,
                }} />
            </div>
            <div role="listbox" style={{ maxHeight: 260, overflowY: 'auto' }}>
              {available.length === 0 ? (
                <p className="mute small" style={{ padding: '14px 16px', margin: 0 }}>
                  {query ? 'Nothing matches “' + query + '”' : 'Everything is selected'}
                </p>
              ) : available.map((o) => (
                <button key={o} type="button" role="option" aria-selected={false}
                  onClick={() => add(o)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '10px 16px', border: 0, background: 'transparent',
                    font: 'inherit', fontSize: 15.5, cursor: 'pointer', color: 'var(--ink)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gold-100)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  {o === 'Other' ? 'Other, please specify' : o}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {picked.length > 0 && (
        <div className="chips" style={{ marginTop: 12 }}>
          {picked.map((v) => (
            <span key={v} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '7px 8px 7px 14px', borderRadius: 999,
              background: 'var(--gold-100)', border: '1px solid var(--gold-200)',
              color: 'var(--gold-700)', fontSize: 15, fontWeight: 500,
            }}>
              {v === 'Other' ? 'Other' : v}
              <button type="button" aria-label={'Remove ' + v} onClick={() => remove(v)}
                style={{
                  display: 'grid', placeItems: 'center', width: 20, height: 20,
                  border: 0, borderRadius: '50%', cursor: 'pointer',
                  background: 'rgba(32,53,138,.12)', color: 'var(--gold-700)',
                  font: 'inherit', fontSize: 13, lineHeight: 1,
                }}>×</button>
            </span>
          ))}
        </div>
      )}

      {picked.map((v) => <input key={v} type="hidden" name={'tag:' + category} value={v} />)}

      {otherOn && (
        <label className="fld" style={{ marginTop: 14, maxWidth: 560 }}>
          <span>Other, please specify</span>
          <input name={'custom:' + category} value={custom}
            onChange={(e) => setCustom(e.target.value)} placeholder="Type your own" />
        </label>
      )}
    </fieldset>
  );
}
