import { createAdminClient } from '@/lib/supabase/server';

export type ConversationSummary = {
  id: string;
  otherId: string;
  otherName: string;
  otherPhoto: string | null;
  otherRoleLevel: string | null;
  lastBody: string | null;
  lastAt: string;
  lastSenderId: string | null;
  unread: boolean;
  blocked: boolean;
};

/** Every conversation for a member, newest first, with the other person resolved. */
export async function getConversations(userId: string): Promise<ConversationSummary[]> {
  const db = createAdminClient();

  const { data: mine } = await db.from('conversation_participants')
    .select('conversation_id,last_read_at').eq('profile_id', userId).eq('archived', false);
  if (!mine?.length) return [];

  const ids = mine.map((r: any) => r.conversation_id);
  const readAt = new Map(mine.map((r: any) => [r.conversation_id, r.last_read_at]));

  const [{ data: convs }, { data: others }, { data: msgs }, { data: blocks }] = await Promise.all([
    db.from('conversations').select('id,last_message_at').in('id', ids),
    db.from('conversation_participants').select('conversation_id,profile_id')
      .in('conversation_id', ids).neq('profile_id', userId),
    db.from('messages').select('conversation_id,body,created_at,sender_id,deleted_at')
      .in('conversation_id', ids).order('created_at', { ascending: false }),
    db.from('blocks').select('blocker_id,blocked_id')
      .or('blocker_id.eq.' + userId + ',blocked_id.eq.' + userId),
  ]);

  const otherIds = Array.from(new Set((others ?? []).map((o: any) => o.profile_id)));
  const { data: people } = otherIds.length
    ? await db.from('profiles').select('id,full_name,photo_url,role_level').in('id', otherIds)
    : { data: [] as any[] };
  const personById = new Map((people ?? []).map((p: any) => [p.id, p]));
  const otherByConv = new Map((others ?? []).map((o: any) => [o.conversation_id, o.profile_id]));

  const lastByConv = new Map<string, any>();
  for (const m of msgs ?? []) if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);

  const blockedIds = new Set<string>();
  for (const b of blocks ?? []) blockedIds.add(b.blocker_id === userId ? b.blocked_id : b.blocker_id);

  return (convs ?? [])
    .map((c: any) => {
      const otherId = otherByConv.get(c.id) ?? '';
      const person = personById.get(otherId);
      const last = lastByConv.get(c.id);
      const seen = readAt.get(c.id);
      return {
        id: c.id,
        otherId,
        otherName: person?.full_name || 'Member',
        otherPhoto: person?.photo_url ?? null,
        otherRoleLevel: person?.role_level ?? null,
        lastBody: last?.deleted_at ? 'Message deleted' : (last?.body ?? null),
        lastAt: last?.created_at ?? c.last_message_at,
        lastSenderId: last?.sender_id ?? null,
        unread: !!last && last.sender_id !== userId && (!seen || new Date(last.created_at) > new Date(seen)),
        blocked: blockedIds.has(otherId),
      };
    })
    .sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));
}

/**
 * Cheap unread count: three small queries, no profile joins.
 * The full conversation list is only built on the Messages page itself.
 */
export async function getUnreadCount(userId: string) {
  const db = createAdminClient();

  const { data: mine } = await db.from('conversation_participants')
    .select('conversation_id,last_read_at').eq('profile_id', userId).eq('archived', false);
  if (!mine?.length) return 0;

  const ids = mine.map((r: any) => r.conversation_id);
  const readAt = new Map(mine.map((r: any) => [r.conversation_id, r.last_read_at]));

  const { data: recent } = await db.from('messages')
    .select('conversation_id,created_at,sender_id')
    .in('conversation_id', ids)
    .neq('sender_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);

  const seenConv = new Set<string>();
  let unread = 0;
  for (const msg of recent ?? []) {
    if (seenConv.has(msg.conversation_id)) continue;
    seenConv.add(msg.conversation_id);
    const seen = readAt.get(msg.conversation_id);
    if (!seen || new Date(msg.created_at) > new Date(seen)) unread++;
  }
  return unread;
}
