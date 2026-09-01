import { createAdminClient } from '@/lib/supabase/server';

export type InboxCounts = {
  accessRequests: number;
  pendingEvents: number;
  openReports: number;
  total: number;
};

const EMPTY: InboxCounts = {
  accessRequests: 0, pendingEvents: 0, openReports: 0, total: 0,
};

/**
 * Everything waiting on an admin decision. This runs in the root layout, so it
 * must never throw — a failed count would take down every page for an admin.
 */
export async function getInboxCounts(): Promise<InboxCounts> {
  try {
    const admin = createAdminClient();

    const count = async (table: string, apply: (q: any) => any) => {
      try {
        const q = admin.from(table).select('id', { count: 'exact', head: true });
        const { count: n } = await apply(q);
        return n ?? 0;
      } catch {
        return 0;
      }
    };

    const [accessRequests, pendingEvents, openReports] = await Promise.all([
      count('access_requests', (q) => q.eq('status', 'pending')),
      count('events', (q) => q.in('status', ['pending', 'draft'])),
      count('post_reports', (q) => q.eq('resolved', false)),
    ]);

    return {
      accessRequests,
      pendingEvents,
      openReports,
      total: accessRequests + pendingEvents + openReports,
    };
  } catch {
    return EMPTY;
  }
}
