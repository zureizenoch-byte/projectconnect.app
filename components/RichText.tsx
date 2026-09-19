'use client';

import React from 'react';

/**
 * Renders the light markup the format bar writes:
 *   **bold**   _italic_   __underline__
 *   "- " bullet lines, "1. " numbered lines
 *
 * Text is stored exactly as typed and parsed into React nodes here — never
 * through innerHTML — so a member writing `<script>` gets the characters they
 * typed and nothing else. Anything unmatched stays literal, which means an
 * unclosed marker looks like a stray asterisk rather than swallowing the rest
 * of the message.
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
    const rule = RULES.find((r) =>
      input.startsWith(r.open, i)
      && (r.open.length > 1 || !/\s/.test(input[i + r.open.length] ?? '')));

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

function inline(text: string, keyBase: string) {
  return tokenize(text).map((t, i) => {
    if (!t.bold && !t.italic && !t.underline) {
      return <React.Fragment key={keyBase + i}>{t.text}</React.Fragment>;
    }
    return (
      <span key={keyBase + i} style={{
        fontWeight: t.bold ? 700 : undefined,
        fontStyle: t.italic ? 'italic' : undefined,
        textDecoration: t.underline ? 'underline' : undefined,
        textUnderlineOffset: t.underline ? 2 : undefined,
      }}>{t.text}</span>
    );
  });
}

// Every dash a keyboard or autocorrect can produce — Unicode's dash-punctuation
// category — plus the common bullet glyphs. Enumerating code points kept
// missing one; the category does not.
// Characters that open something else at the start of a line, so they are not
// list markers however they are spaced.
const NOT_A_BULLET = '#>"\\'([{@/\\\\|';
const DASH = '(?![' + NOT_A_BULLET + '])[\\p{P}\\p{S}]';
const LIST_LEAD = new RegExp('^(\\s*(?:' + DASH + '|\\d+[.)])\\s+)?([\\s\\S]*)$', 'u');
const MARKERS = ['__', '**', '*', '_'];

/**
 * Turn a marker pair that spans several lines into one pair per line, with any
 * list prefix left outside. Selecting four bullets and pressing B writes a
 * single span across all of them; without this the markers would render as
 * literal asterisks, which is exactly what they did.
 */
function redistribute(text: string): string {
  let out = '';
  let i = 0;

  while (i < text.length) {
    const marker = MARKERS.find((m) => {
      if (!text.startsWith(m, i)) return false;
      // "* " and "_ " are a bullet and an underscore, not emphasis
      return m.length > 1 || !/\s/.test(text[i + m.length] ?? '');
    });

    if (marker) {
      const from = i + marker.length;
      const end = text.indexOf(marker, from);
      if (end > from) {
        const inner = text.slice(from, end);
        if (inner.includes('\n')) {
          out += inner.split('\n').map((line) => {
            const [, lead = '', body = ''] = line.match(LIST_LEAD) ?? [];
            return body.trim() ? lead + marker + body + marker : line;
          }).join('\n');
        } else {
          out += marker + inner + marker;
        }
        i = end + marker.length;
        continue;
      }
    }

    out += text[i];
    i++;
  }

  return out;
}

const BULLET = new RegExp('^\\s*' + DASH + '\\s+(.*)$', 'u');
const NUMBER = /^\s*(\d+)[.)]\s+(.*)$/;

type Block =
  | { kind: 'text'; lines: string[] }
  | { kind: 'bullet'; items: string[] }
  | { kind: 'number'; items: string[]; start: number };

/** Group consecutive list lines so a list reads as one block, not many. */
function blocks(text: string): Block[] {
  const out: Block[] = [];

  for (const line of text.split('\n')) {
    const bullet = line.match(BULLET);
    const numbered = line.match(NUMBER);
    const last = out[out.length - 1];

    if (bullet) {
      if (last?.kind === 'bullet') last.items.push(bullet[1]);
      else out.push({ kind: 'bullet', items: [bullet[1]] });
    } else if (numbered) {
      if (last?.kind === 'number') last.items.push(numbered[2]);
      else out.push({ kind: 'number', items: [numbered[2]], start: Number(numbered[1]) || 1 });
    } else if (last?.kind === 'text') {
      last.lines.push(line);
    } else {
      out.push({ kind: 'text', lines: [line] });
    }
  }

  return out;
}

export function RichText({ text, style }: { text: string; style?: React.CSSProperties }) {
  if (!text) return null;

  const source = redistribute(text);
  const parsed = blocks(source);
  const hasList = parsed.some((b) => b.kind !== 'text');

  // Nothing but prose: keep it inline, so it can sit inside a <p> untouched.
  if (!hasList) {
    return <span style={{ whiteSpace: 'pre-wrap', ...style }}>{inline(source, 't')}</span>;
  }

  const listStyle: React.CSSProperties = {
    margin: '8px 0', paddingLeft: 22, display: 'grid', gap: 4,
  };

  return (
    <span style={{ display: 'block', ...style }}>
      {parsed.map((b, i) => {
        if (b.kind === 'bullet') {
          return (
            <ul key={i} style={{ ...listStyle, listStyle: 'none', paddingLeft: 4 }}>
              {b.items.map((item, j) => (
                <li key={j} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span aria-hidden style={{
                    flex: 'none', width: 5, height: 5, borderRadius: '50%',
                    background: 'var(--gold)', transform: 'translateY(-2px)',
                  }} />
                  <span>{inline(item, i + '-' + j + '-')}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (b.kind === 'number') {
          return (
            <ol key={i} start={b.start} style={{ ...listStyle, listStyle: 'none', paddingLeft: 4 }}>
              {b.items.map((item, j) => (
                <li key={j} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span aria-hidden style={{
                    flex: 'none', minWidth: 18, fontVariantNumeric: 'tabular-nums',
                    fontWeight: 600, color: 'var(--gold-700)', fontSize: '.92em',
                  }}>{b.start + j}.</span>
                  <span>{inline(item, i + '-' + j + '-')}</span>
                </li>
              ))}
            </ol>
          );
        }

        const body = b.lines.join('\n').replace(/^\n+|\n+$/g, '');
        if (!body) return null;
        return (
          <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{inline(body, i + '-')}</span>
        );
      })}
    </span>
  );
}
