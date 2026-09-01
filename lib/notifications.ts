import { createAdminClient } from '@/lib/supabase/server';

export type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export async function getNotifications(userId: string, limit = 30) {
  try {
    const db = createAdminClient();
    const { data } = await db.from('notifications')
    .select('id,kind,title,body,href,read_at,created_at')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as Notification[];
  } catch {
    return [] as Notification[];
  }
}

/** Runs in the root layout, so it must never throw. */
export async function getUnreadNotificationCount(userId: string) {
  try {
    const db = createAdminClient();
    const { count } = await db.from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', userId).is('read_at', null);
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** A small glyph per notification kind — no icon library needed. */
export function notificationGlyph(kind: string) {
  if (kind.startsWith('event.cancelled')) return '✕';
  if (kind.startsWith('event.postponed')) return '⏸';
  if (kind.startsWith('event.rescheduled')) return '⇄';
  if (kind.startsWith('event.restored')) return '▶';
  if (kind.startsWith('event')) return '★';
  if (kind.startsWith('seat.confirmed')) return '✓';
  if (kind.startsWith('seat')) return '◔';
  if (kind.startsWith('message')) return '✉';
  if (kind.startsWith('access')) return '⚑';
  return '•';
}

export function notificationTone(kind: string) {
  if (kind.includes('cancelled') || kind.includes('rejected')) return 'var(--err)';
  if (kind.includes('confirmed') || kind.includes('approved') || kind.includes('restored')) return 'var(--ok)';
  return 'var(--gold-700)';
}
