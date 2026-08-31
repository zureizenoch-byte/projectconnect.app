'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';

async function log(actorId: string, action: string, target: string, meta?: unknown) {
  const admin = createAdminClient();
  await admin.from('audit_log').insert({ actor_id: actorId, action, target, meta: meta ?? null });
}

/** Approval goes through the database function, which writes the grant and the role together. */
export async function decideAccessRequest(requestId: string, approve: boolean) {
  await requireRole('admin');
  const supabase = createClient();
  const { error } = await supabase.rpc('approve_access_request', {
    req_id: requestId, approve,
  });
  if (error) return { error: error.message };
  revalidatePath('/admin');
  return { ok: true };
}

/** Revoke any elevated role — speaker, chapter_lead or admin. */
export async function revokeRole(profileId: string, role: 'speaker' | 'chapter_lead' | 'admin') {
  const { profile } = await requireRole('admin');
  if (profileId === profile.id) {
    return { error: 'You cannot revoke your own admin access.' };
  }
  const supabase = createClient();
  const { error } = await supabase.rpc('revoke_role', {
    target_profile: profileId, target_role: role,
  });
  if (error) return { error: error.message };
  revalidatePath('/admin');
  return { ok: true };
}

/** Grant a role directly, without waiting for the person to apply. */
export async function grantRole(formData: FormData) {
  const { profile } = await requireRole('admin');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = String(formData.get('role') ?? '');
  if (!email) return { error: 'Enter an email address' };
  if (!['speaker', 'chapter_lead', 'admin'].includes(role)) return { error: 'Pick a role' };

  const admin = createAdminClient();
  const { data: target } = await admin.from('profiles')
    .select('id,chapter_id').ilike('email', email).maybeSingle();
  if (!target) return { error: 'No account with that email. They need to sign up first.' };

  await admin.from('role_grants').insert({
    profile_id: target.id,
    role,
    chapter_id: role === 'chapter_lead' ? target.chapter_id : null,
    granted_by: profile.id,
  });
  const patch: Record<string, unknown> = { role };
  if (role === 'chapter_lead') patch.lead_chapter_id = target.chapter_id;
  const { error } = await admin.from('profiles').update(patch).eq('id', target.id);
  if (error) return { error: error.message };

  await log(profile.id, 'access.grant', target.id, { role, email });
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
