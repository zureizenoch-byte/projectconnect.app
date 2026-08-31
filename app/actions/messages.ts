'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { requireSession } from '@/lib/auth';

export type MsgState = { error?: string; ok?: string };

/** Find the existing one-to-one conversation, or start one. */
export async function openConversation(otherId: string) {
  const { user } = await requireSession();
  if (otherId === user.id) return { error: 'You cannot message yourself.' };

  const db = createAdminClient();

  const { data: blocked } = await db.from('blocks').select('blocker_id')
    .or('and(blocker_id.eq.' + user.id + ',blocked_id.eq.' + otherId + '),' +
        'and(blocker_id.eq.' + otherId + ',blocked_id.eq.' + user.id + ')');
  if (blocked?.length) return { error: 'You cannot message this member.' };

  const { data: privacy } = await db.from('privacy_settings')
    .select('allow_contact').eq('profile_id', otherId).maybeSingle();
  if (privacy && privacy.allow_contact === false) {
    return { error: 'This member has turned off direct messages.' };
  }

  const { data: mine } = await db.from('conversation_participants')
    .select('conversation_id').eq('profile_id', user.id);
  const myIds = (mine ?? []).map((r: any) => r.conversation_id);

  if (myIds.length) {
    const { data: shared } = await db.from('conversation_participants')
      .select('conversation_id').eq('profile_id', otherId).in('conversation_id', myIds);
    if (shared?.length) return { ok: shared[0].conversation_id };
  }

  const { data: conv, error } = await db.from('conversations')
    .insert({ created_by: user.id }).select('id').single();
  if (error || !conv) return { error: error?.message ?? 'Could not start the conversation.' };

  const { error: partError } = await db.from('conversation_participants').insert([
    { conversation_id: conv.id, profile_id: user.id },
    { conversation_id: conv.id, profile_id: otherId },
  ]);
  if (partError) return { error: partError.message };

  return { ok: conv.id };
}

export async function startAndGo(formData: FormData) {
  const otherId = String(formData.get('other_id') ?? '');
  const res = await openConversation(otherId);
  if (res.error) return { error: res.error };
  redirect('/messages/' + res.ok);
}

export async function sendMessage(formData: FormData) {
  const { user } = await requireSession();
  const conversationId = String(formData.get('conversation_id') ?? '');
  const body = String(formData.get('body') ?? '').trim();
  if (!body) return { error: 'Write something first.' };
  if (body.length > 4000) return { error: 'Messages are limited to 4000 characters.' };

  const db = createAdminClient();
  const { data: member } = await db.from('conversation_participants')
    .select('profile_id').eq('conversation_id', conversationId).eq('profile_id', user.id).maybeSingle();
  if (!member) return { error: 'You are not part of this conversation.' };

  const { error } = await db.from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, body });
  if (error) return { error: error.message };

  await db.from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId).eq('profile_id', user.id);

  revalidatePath('/messages/' + conversationId);
  revalidatePath('/messages');
  return { ok: 'sent' };
}

export async function markRead(conversationId: string) {
  const { user } = await requireSession();
  const db = createAdminClient();
  await db.from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId).eq('profile_id', user.id);
  revalidatePath('/messages');
  return { ok: 'read' };
}

export async function deleteMessage(messageId: string) {
  const { user, profile } = await requireSession();
  const db = createAdminClient();
  const { data: msg } = await db.from('messages')
    .select('id,sender_id,conversation_id').eq('id', messageId).maybeSingle();
  if (!msg) return { error: 'Message not found.' };
  if (msg.sender_id !== user.id && profile.role !== 'admin') return { error: 'Not your message.' };

  await db.from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', messageId);
  revalidatePath('/messages/' + msg.conversation_id);
  return { ok: 'deleted' };
}

export async function blockMember(formData: FormData) {
  const { user } = await requireSession();
  const blockedId = String(formData.get('blocked_id') ?? '');
  const reason = String(formData.get('reason') ?? '').slice(0, 500);
  if (!blockedId || blockedId === user.id) return { error: 'Invalid member.' };

  const db = createAdminClient();
  const { error } = await db.from('blocks')
    .upsert({ blocker_id: user.id, blocked_id: blockedId, reason });
  if (error) return { error: error.message };

  revalidatePath('/messages');
  revalidatePath('/settings/blocked');
  return { ok: 'Member blocked. They can no longer message you.' };
}

export async function unblockMember(blockedId: string) {
  const { user } = await requireSession();
  const db = createAdminClient();
  const { error } = await db.from('blocks')
    .delete().eq('blocker_id', user.id).eq('blocked_id', blockedId);
  if (error) return { error: error.message };
  revalidatePath('/settings/blocked');
  return { ok: 'Unblocked.' };
}

export async function reportMessage(formData: FormData) {
  const { user } = await requireSession();
  const db = createAdminClient();

  const messageId = String(formData.get('message_id') ?? '') || null;
  const conversationId = String(formData.get('conversation_id') ?? '') || null;
  const reportedId = String(formData.get('reported_id') ?? '') || null;
  const reason = String(formData.get('reason') ?? 'other');
  const detail = String(formData.get('detail') ?? '').slice(0, 1000);
  const alsoBlock = formData.get('also_block') === 'on';

  const { error } = await db.from('message_reports').insert({
    message_id: messageId,
    conversation_id: conversationId,
    reporter_id: user.id,
    reported_id: reportedId,
    reason,
    detail,
  });
  if (error) return { error: error.message };

  if (alsoBlock && reportedId) {
    await db.from('blocks').upsert({
      blocker_id: user.id, blocked_id: reportedId, reason: 'Reported: ' + reason,
    });
  }

  revalidatePath('/messages');
  revalidatePath('/admin');
  return { ok: 'Reported. An admin will review it' + (alsoBlock ? ', and this member is now blocked.' : '.') };
}
