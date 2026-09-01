import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { AdminControls } from './AdminControls';
import { SectionBoundary } from './SectionBoundary';
import { getInboxCounts } from '@/lib/inbox';

export const metadata = { title: 'Admin — Project Connect' };

export default async function AdminPage() {
  const { profile: me } = await requireRole('admin');
  // Page is gated by requireRole('admin'); read past RLS so nothing can be hidden from the queue.
  const supabase = createAdminClient();
  const inbox = await getInboxCounts();

  const [{ data: requests }, { data: pendingEvents }, { data: leads }, { data: reports }, { data: chapters }, { data: venues }, { data: log }] =
    await Promise.all([
      supabase.from('access_requests')
        .select('id,kind,status,note,created_at,chapter_id,profile_id')
        .eq('status', 'pending').order('created_at'),
      supabase.from('events')
        .select('id,title,kind,starts_at,status,chapter_id,created_by')
        .in('status', ['pending', 'draft']).order('starts_at'),
      supabase.from('profiles')
        .select('id,full_name,email,role,lead_chapter_id,speaker_approved,city')
        .in('role', ['chapter_lead', 'speaker', 'admin']),
      supabase.from('post_reports')
        .select('id,reason,created_at,post_id')
        .eq('resolved', false).order('created_at'),
      supabase.from('chapters').select('id,city'),
      supabase.from('venues').select('id,name,address,capacity,notes,active,chapter_id,contact_email,contact_name,notify,website,phone').order('name'),
      supabase.from('audit_log').select('id,action,target,created_at,actor_id')
        .order('created_at', { ascending: false }).limit(20),
    ]);

  const { data: msgReports } = await supabase
    .from('message_reports')
    .select('id,reason,detail,created_at,reporter_id,reported_id,message_id,conversation_id')
    .eq('resolved', false).order('created_at');

  const venueNotices = await supabase
    .from('venue_notifications')
    .select('id,event_id,venue_id,to_email,status,error,sent_at,created_at')
    .order('created_at', { ascending: false }).limit(200)
    .then((r) => r.data ?? [])
    .catch(() => [] as any[]);

  const { data: everyone } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,city,speaker_approved')
    .order('created_at');

  // resolve names and cities from the account list rather than SQL joins
  const byId = new Map((everyone ?? []).map((p: any) => [p.id, p]));
  const cityOf = new Map((chapters ?? []).map((c: any) => [c.id, c.city]));

  const { data: reportedPosts } = (reports ?? []).length
    ? await supabase.from('posts').select('id,body,author_id')
        .in('id', (reports ?? []).map((r: any) => r.post_id))
    : { data: [] as any[] };
  const postById = new Map((reportedPosts ?? []).map((p: any) => [p.id, p]));

  const requestRows = (requests ?? []).map((r: any) => ({
    ...r,
    profiles: byId.get(r.profile_id) ?? null,
    chapters: { city: cityOf.get(r.chapter_id) ?? null },
  }));
  const eventRows = (pendingEvents ?? []).map((e: any) => ({
    ...e,
    profiles: byId.get(e.created_by) ?? null,
    chapters: { city: cityOf.get(e.chapter_id) ?? null },
  }));
  const { data: grants } = await supabase
    .from('role_grants').select('profile_id,role,granted_at').is('revoked_at', null);
  const grantedAt = new Map((grants ?? []).map((g: any) => [g.profile_id + ':' + g.role, g.granted_at]));

  const leadRows = (leads ?? []).map((p: any) => ({
    ...p,
    chapters: { city: cityOf.get(p.lead_chapter_id) ?? p.city ?? null },
    granted_at: grantedAt.get(p.id + ':' + p.role) ?? null,
  }));
  const reportRows = (reports ?? []).map((r: any) => {
    const post = postById.get(r.post_id);
    return { ...r, posts: post ? { ...post, profiles: byId.get(post.author_id) ?? null } : null };
  });
  const logRows = (log ?? []).map((l: any) => ({ ...l, profiles: byId.get(l.actor_id) ?? null }));

  const { data: reportedMsgs } = (msgReports ?? []).filter((r: any) => r.message_id).length
    ? await supabase.from('messages').select('id,body')
        .in('id', (msgReports ?? []).filter((r: any) => r.message_id).map((r: any) => r.message_id))
    : { data: [] as any[] };
  const msgById = new Map((reportedMsgs ?? []).map((m: any) => [m.id, m]));

  const messageReportRows = (msgReports ?? []).map((r: any) => ({
    ...r,
    reporter: byId.get(r.reporter_id) ?? null,
    reported: byId.get(r.reported_id) ?? null,
    message: r.message_id ? msgById.get(r.message_id) ?? null : null,
  }));

  return (
    <main className="wrap">
      <h1>Admin</h1>
      <p className="mute" style={{ marginTop: 10, maxWidth: '62ch' }}>
        Approvals, access grants, venues and reports. Every decision here is written to the audit log.
      </p>

      <section className="surf" style={{
        padding: 'clamp(20px,3vw,28px)', marginTop: 26,
        background: inbox.total > 0
          ? 'linear-gradient(160deg,var(--gold-100),#fff)'
          : '#fff',
        borderColor: inbox.total > 0 ? 'var(--gold-200)' : 'var(--line)',
      }}>
        <p className="eyebrow">Needs your attention</p>
        {inbox.total === 0 ? (
          <p style={{ margin: '10px 0 0', fontSize: 17 }}>
            Nothing waiting. The queue is clear.
          </p>
        ) : (
          <>
            <h2 style={{ marginTop: 10, fontSize: 28 }}>
              {inbox.total} {inbox.total === 1 ? 'item' : 'items'} waiting on you
            </h2>
            <div className="row" style={{ gap: 10, marginTop: 16 }}>
              {inbox.accessRequests > 0 && (
                <a className="btn btn-gold" href="#access-requests"
                  style={{ minHeight: 40, padding: '0 16px', fontSize: 14.5 }}>
                  {inbox.accessRequests} access {inbox.accessRequests === 1 ? 'request' : 'requests'}
                </a>
              )}
              {inbox.pendingEvents > 0 && (
                <a className="btn btn-out" href="#pending-events"
                  style={{ minHeight: 40, padding: '0 16px', fontSize: 14.5 }}>
                  {inbox.pendingEvents} {inbox.pendingEvents === 1 ? 'event' : 'events'} to approve
                </a>
              )}
              {inbox.messageReports > 0 && (
                <a className="btn btn-out" href="#message-reports"
                  style={{ minHeight: 40, padding: '0 16px', fontSize: 14.5 }}>
                  {inbox.messageReports} reported {inbox.messageReports === 1 ? 'message' : 'messages'}
                </a>
              )}
              {inbox.openReports > 0 && (
                <a className="btn btn-out" href="#reports"
                  style={{ minHeight: 40, padding: '0 16px', fontSize: 14.5 }}>
                  {inbox.openReports} reported {inbox.openReports === 1 ? 'post' : 'posts'}
                </a>
              )}
            </div>
          </>
        )}
      </section>
      <SectionBoundary title="Admin console">
      <AdminControls
        requests={requestRows}
        pendingEvents={eventRows}
        leads={leadRows}
        reports={reportRows}
        chapters={chapters ?? []}
        venues={venues ?? []}
        venueNotices={venueNotices}
        log={logRows}
        messageReports={messageReportRows}
        everyone={everyone ?? []}
        currentAdminId={me.id}
      />
      </SectionBoundary>
    </main>
  );
}
