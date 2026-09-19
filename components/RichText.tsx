'use client';

import React from 'react';

/**
 * Renders the light markup the format bar writes: **bold**, _italic_,
 * __underline__.
 *
 * Text is stored exactly as typed and parsed into React nodes here — never
 * through innerHTML — so a member writing `<script>` gets the characters they
 * typed and nothing else. Anything unmatched stays as literal text, which
 * means an unclosed marker looks like a stray asterisk rather than swallowing
 * the rest of the message.
 */

type Token = { text: string; bold?: boolean; italic?: boolean; underline?: boolean };

// Longest markers first: __ before _, ** before *.
const RULES: { open: string; close: string; mark: keyof Omit<Token, 'text'> }[] = [
  { open: '__', close: '__', mark: 'underline' },
  { open: '**', close: '**', mark: 'bold' },
  { open: '*', close: '*', mark: 'italic' },
  { open: '_', close: '_', mark: 'italic' },
];

function tokenize(input: string, active: Omit<Token, 'text'> = {}): Token[] {
  const out: Token[] = [];
  let plain = '';

  for (let i = 0; i < input.length; i++) {
    const rule = RULES.find((r) => input.startsWith(r.open, i));

    if (rule) {
      const from = i + rule.open.length;
      const end = input.indexOf(rule.close, from);
      // a marker with nothing after it is just a character
      if (end > from) {
        if (plain) { out.push({ text: plain, ...active }); plain = ''; }
        out.push(...tokenize(input.slice(from, end), { ...active, [rule.mark]: true }));
        i = end + rule.close.length - 1;
        continue;
      }
    }

    plain += input[i];
  }

  if (plain) out.push({ text: plain, ...active });
  return out;
}

export function RichText({ text, style }: { text: string; style?: React.CSSProperties }) {
  if (!text) return null;

  const nodes = tokenize(text).map((t, i) => {
    if (!t.bold && !t.italic && !t.underline) {
      return <React.Fragment key={i}>{t.text}</React.Fragment>;
    }
    return (
      <span key={i} style={{
        fontWeight: t.bold ? 700 : undefined,
        fontStyle: t.italic ? 'italic' : undefined,
        textDecoration: t.underline ? 'underline' : undefined,
        textUnderlineOffset: t.underline ? 2 : undefined,
      }}>{t.text}</span>
    );
  });

  return <span style={{ whiteSpace: 'pre-wrap', ...style }}>{nodes}</span>;
}
