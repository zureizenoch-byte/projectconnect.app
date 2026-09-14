/**
 * The reactions a post can carry.
 *
 * A plain module, not the server-action file: a `'use server'` module may only
 * export async functions, so a constant imported from there into a client
 * component fails at runtime.
 */
export const REACTIONS = [
  { key: 'like',  emoji: '👍', label: 'Like' },
  { key: 'love',  emoji: '❤️', label: 'Love' },
  { key: 'yes',   emoji: '🙌', label: 'This' },
  { key: 'laugh', emoji: '😄', label: 'Funny' },
  { key: 'idea',  emoji: '💡', label: 'Insightful' },
  { key: 'oof',   emoji: '😬', label: 'Been there' },
] as const;

export const REACTION_KEYS: readonly string[] = REACTIONS.map((r) => r.key);

export function reactionEmoji(key?: string | null) {
  return REACTIONS.find((r) => r.key === key)?.emoji;
}

export function reactionLabel(key?: string | null) {
  return REACTIONS.find((r) => r.key === key)?.label;
}
