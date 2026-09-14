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

/** Everything else, reachable behind the + on the reaction bar. */
export const MORE_REACTIONS = [
  { key: 'clap',    emoji: '👏', label: 'Applause' },
  { key: 'fire',    emoji: '🔥', label: 'On fire' },
  { key: 'hundred', emoji: '💯', label: 'Exactly' },
  { key: 'party',   emoji: '🎉', label: 'Congratulations' },
  { key: 'thanks',  emoji: '🙏', label: 'Thank you' },
  { key: 'strong',  emoji: '💪', label: 'Strength' },
  { key: 'star',    emoji: '⭐', label: 'Standout' },
  { key: 'rocket',  emoji: '🚀', label: 'Shipping' },
  { key: 'eyes',    emoji: '👀', label: 'Watching' },
  { key: 'think',   emoji: '🤔', label: 'Thinking' },
  { key: 'sad',     emoji: '😢', label: 'Sad' },
  { key: 'wow',     emoji: '😮', label: 'Surprised' },
  { key: 'coffee',  emoji: '☕', label: 'Coffee' },
  { key: 'agree',   emoji: '🤝', label: 'Agreed' },
  { key: 'brain',   emoji: '🧠', label: 'Smart' },
  { key: 'target',  emoji: '🎯', label: 'On point' },
  { key: 'chart',   emoji: '📈', label: 'Growth' },
  { key: 'salute',  emoji: '🫡', label: 'Respect' },
] as const;

export const ALL_REACTIONS = [...REACTIONS, ...MORE_REACTIONS];

export const REACTION_KEYS: readonly string[] = ALL_REACTIONS.map((r) => r.key);

export function reactionEmoji(key?: string | null) {
  return ALL_REACTIONS.find((r) => r.key === key)?.emoji;
}

export function reactionLabel(key?: string | null) {
  return ALL_REACTIONS.find((r) => r.key === key)?.label;
}
