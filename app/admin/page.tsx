import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminControls } from './AdminControls';

export const metadata = { title: 'Admin — Project Connect' };

export default async function AdminPage() {
  const { profile: me } = await requireRole('admin');
  const supabase = createClient();

  const [{ data: requests }, { data: pendingEvents }, { data: leads }, { data: reports }, { data: chapters }, { data: venues }, { data: log }] =
    await Promise.all([
      supabase.from('access_requests')
        .select('id,kind,status,note,created_at,chapters(city),profiles(full_name,email)')
        .eq('status', 'pending').order('created_at'),
      supabase.from('events')
        .select('id,title,kind,starts_at,status,chapters(city),profiles:created_by(full_name)')
        .in('status', ['pending', 'draft']).order('starts_at'),
      supabase.from('profiles')
        .select('id,full_name,email,role,lead_chapter_id,chapters:lead_chapter_id(city)')
        .in('role', ['chapter_lead', 'speaker', 'admin']),
      supabase.from('post_reports')
        .select('id,reason,created_at,post_id,posts(body)')
        .eq('resolved', false).order('created_at'),
      supabase.from('chapters').select('id,city'),
      supabase.from('venues').select('id,name,address,capacity,notes,active,chapter_id').order('name'),
      supabase.from('audit_log').select('id,action,target,created_at,profiles:actor_id(full_name)')
        .order('created_at', { ascending: false }).limit(20),
    ]);

  const { data: everyone } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,city,speaker_approved')
    .order('created_at');

  return (
    <main className="wrap">
      <h1>Admin</h1>
      <p className="mute" style={{ marginTop: 10, maxWidth: '62ch' }}>
        Approvals, access grants, venues and reports. Every decision here is written to the audit log.
      </p>
      <AdminControls
        requests={requests ?? []}
        pendingEvents={pendingEvents ?? []}
        leads={leads ?? []}
        reports={reports ?? []}
        chapters={chapters ?? []}
        venues={venues ?? []}
        log={log ?? []}
        everyone={everyone ?? []}
        currentAdminId={me.id}
      />
    </main>
  );
}
