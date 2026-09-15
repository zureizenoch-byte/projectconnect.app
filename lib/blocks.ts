import { createAdminClient } from '@/lib/supabase/server';

/**
 * Blocking, read on the server.
 *
 * A block is symmetric in effect: neither person sees or reaches the other.
 * Nothing here ever tells the blocked person they were blocked — callers
 * report content as unavailable, which is true from where they stand.
 */

/** Everyone in a block relationship with this person, either direction. */
export async function blockedIdsFor(userId: string): Promise<Set<string>> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('blocks')
    .select('blocker_id,blocked_id')
    .or('blocker_id.eq.' + userId + ',blocked_id.eq.' + userId);

  // A failed read must not quietly undo someone's block, but it also cannot
  // black out the whole feed — an empty set with the error swallowed is the
  // lesser harm here, and the per-action guard below still refuses on error.
  if (error) return new Set();

  const ids = new Set<string>();
  for (const row of data ?? []) {
    ids.add(row.blocker_id === userId ? row.blocked_id : row.blocker_id);
  }
  return ids;
}

/** Is there a block between these two, either direction? */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const db = createAdminClient();
  const { data, error } = await db
    .from('blocks')
    .select('blocker_id')
    .or(
      'and(blocker_id.eq.' + a + ',blocked_id.eq.' + b + '),'
      + 'and(blocker_id.eq.' + b + ',blocked_id.eq.' + a + ')',
    );

  // Erring toward blocked: refusing an action is recoverable, letting a
  // blocked person through is not.
  if (error) return true;
  return (data ?? []).length > 0;
}

/**
 * Guard for anything done to someone else's post or comment. Returns an error
 * shaped like every other action's, or null when the way is clear.
 */
export async function guardPostInteraction(userId: string, postId: string) {
  const db = createAdminClient();
  const { data: post } = await db.from('posts')
    .select('author_id').eq('id', postId).maybeSingle();

  if (!post) return { error: 'This post is no longer available.' };
  if (!post.author_id || post.author_id === userId) return null;

  const blocked = await isBlockedBetween(userId, post.author_id);
  return blocked ? { error: 'This post is no longer available.' } : null;
}
