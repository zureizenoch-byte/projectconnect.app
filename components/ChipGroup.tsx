'use client';
import { useState } from 'react';

/**
 * Click-to-add chips. Selected values post as repeated `tag:<category>` fields;
 * an "Other" pick reveals a free-text field posting as `custom:<category>`.
 */
export function ChipGroup({
  category, label, options, initial = [], initialCustom = '', allowOther = true,
}: {
  category: string; label: string; options: string[];
  initial?: string[]; initialCustom?: string; allowOther?: boolean;
}) {
  const [picked, setPicked] = useState<string[]>(initial);
  const [custom, setCustom] = useState(initialCustom);
  const otherOn = picked.includes('Other') || custom.length > 0;

  const toggle = (v: string) =>
    setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  return (
    <fieldset style={{ border: 0, padding: 0, margin: '0 0 26px' }}>
      <legend style={{ fontSize: 17.5, fontWeight: 600, marginBottom: 10 }}>{label}</legend>
      <div className="chips">
        {options.map((o) => (
          <button key={o} type="button" className="chip"
            aria-pressed={picked.includes(o)} onClick={() => toggle(o)}>{o}</button>
        ))}
        {allowOther && (
          <button type="button" className="chip" aria-pressed={otherOn}
            onClick={() => toggle('Other')}>Other, please specify</button>
        )}
      </div>
      {picked.map((v) => <input key={v} type="hidden" name={'tag:' + category} value={v} />)}
      {otherOn && (
        <label className="fld" style={{ marginTop: 14, maxWidth: 520 }}>
          <span>Other, please specify</span>
          <input name={'custom:' + category} value={custom}
            onChange={(e) => setCustom(e.target.value)} placeholder="Type your own" />
        </label>
      )}
    </fieldset>
  );
}
