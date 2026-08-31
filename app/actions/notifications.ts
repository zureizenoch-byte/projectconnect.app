'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { requireSession } from '@/lib/auth';

export async function markNotificationRead(id: string) {
  const { user } = await requireSession();
  const db = createAdminClient();
  await db.from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id).eq('profile_id', user.id);
  revalidatePath('/notifications');
  return { ok: true };
}

export async function markAllRead() {
  const { user } = await requireSession();
  const db = createAdminClient();
  await db.from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('profile_id', user.id).is('read_at', null);
  revalidatePath('/notifications');
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function clearRead() {
  const { user } = await requireSession();
  const db = createAdminClient();
  await db.from('notifications')
    .delete().eq('profile_id', user.id).not('read_at', 'is', null);
  revalidatePath('/notifications');
  return { ok: true };
}
