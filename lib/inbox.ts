import { createAdminClient } from '@/lib/supabase/server';

export type InboxCounts = {
  accessRequests: number;
  pendingEvents: number;
  openReports: number;
  messageReports: number;
  total: number;
};

/** Everything waiting on an admin decision, counted in one round trip. */
export async function getInboxCounts(): Promise<InboxCounts> {
  const admin = createAdminClient();

  const [requests, events, reports, msgReports] = await Promise.all([
    admin.from('access_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('events').select('id', { count: 'exact', head: true }).in('status', ['pending', 'draft']),
    admin.from('post_reports').select('id', { count: 'exact', head: true }).eq('resolved', false),
    admin.from('message_reports').select('id', { count: 'exact', head: true }).eq('resolved', false),
  ]);

  const accessRequests = requests.count ?? 0;
  const pendingEvents = events.count ?? 0;
  const openReports = reports.count ?? 0;
  const messageReports = msgReports.count ?? 0;

  return {
    accessRequests,
    pendingEvents,
    openReports,
    messageReports,
    total: accessRequests + pendingEvents + openReports + messageReports,
  };
}
