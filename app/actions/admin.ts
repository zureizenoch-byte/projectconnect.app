'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';

async function log(actorId: string, action: string, target: string, meta?: unknown) {
  const admin = createAdminClient();
  await admin.from('audit_log').insert({ actor_id: actorId, action, target, meta: meta ?? null });
}

export async function decideAccessRequest(requestId: string, approve: boolean) {
  const { profile } = await requireRole('admin');
  const admin = createAdminClient();

  const { data: req } = await admin.from('access_requests').select('*').eq('id', requestId).single();
  if (!req) return { error: 'Request not found' };

  await admin.from('access_requests').update({
    status: approve ? 'approved' : 'rejected',
    decided_by: profile.id,
    decided_at: new Date().toISOString(),
  }).eq('id', requestId);

  if (approve) {
    if (req.kind === 'speaker') {
      await admin.from('profiles')
        .update({ role: 'speaker', speaker_approved: true }).eq('id', req.profile_id);
    } else {
      // Chapter Lead access is a role plus the chapter it applies to.
      await admin.from('profiles')
        .update({ role: 'chapter_lead', lead_chapter_id: req.chapter_id }).eq('id', req.profile_id);
    }
  }

  await log(profile.id, approve ? 'access.approve' : 'access.reject', req.profile_id, { kind: req.kind });
  revalidatePath('/admin');
  return { ok: true };
}

export async function revokeLead(profileId: string) {
  const { profile } = await requireRole('admin');
  const admin = createAdminClient();
  await admin.from('profiles')
    .update({ role: 'member', lead_chapter_id: null }).eq('id', profileId);
  await log(profile.id, 'access.revoke_lead', profileId);
  revalidatePath('/admin');
  return { ok: true };
}

export async function setEventStatus(eventId: string, status: 'published' | 'draft' | 'cancelled') {
  const { profile } = await requireRole('admin');
  const admin = createAdminClient();
  await admin.from('events').update({
    status,
    published_at: status === 'published' ? new Date().toISOString() : null,
  }).eq('id', eventId);
  await log(profile.id, 'event.' + status, eventId);
  revalidatePath('/admin');
  revalidatePath('/events');
  return { ok: true };
}

export async function saveVenue(formData: FormData) {
  const { profile } = await requireRole('admin');
  const admin = createAdminClient();
  const id = String(formData.get('id') ?? '');
  const row = {
    chapter_id: String(formData.get('chapter_id')),
    name: String(formData.get('name') ?? '').slice(0, 160),
    address: String(formData.get('address') ?? '').slice(0, 300),
    maps_query: String(formData.get('address') ?? '').slice(0, 300),
    capacity: Math.min(15, Math.max(1, Number(formData.get('capacity') ?? 15))),
    notes: String(formData.get('notes') ?? '').slice(0, 600),
    active: formData.get('active') !== null,
  };
  const { error } = id
    ? await admin.from('venues').update(row).eq('id', id)
    : await admin.from('venues').insert(row);
  if (error) return { error: error.message };
  await log(profile.id, id ? 'venue.update' : 'venue.create', id || row.name);
  revalidatePath('/admin');
  revalidatePath('/venues');
  return { ok: true };
}

export async function resolveReport(reportId: string) {
  const { profile } = await requireRole('admin');
  const admin = createAdminClient();
  await admin.from('post_reports').update({ resolved: true }).eq('id', reportId);
  await log(profile.id, 'report.resolve', reportId);
  revalidatePath('/admin');
  return { ok: true };
}
