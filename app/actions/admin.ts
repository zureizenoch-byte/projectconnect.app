'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireRole, requireSession } from '@/lib/auth';

async function log(actorId: string, action: string, target: string, meta?: unknown) {
  const admin = createAdminClient();
  await admin.from('audit_log').insert({ actor_id: actorId, action, target, meta: meta ?? null });
}

/**
 * Set a role reliably: write the grant first so the governance trigger is satisfied,
 * then the role. Service-role client, so RLS never silently drops the write.
 */
async function applyRole(profileId: string, role: string, chapterId?: string | null) {
  const admin = createAdminClient();

  if (role === 'member' || role === 'student') {
    await admin.from('role_grants')
      .update({ revoked_at: new Date().toISOString() })
      .eq('profile_id', profileId).is('revoked_at', null);
  } else {
    const { data: existing } = await admin.from('role_grants')
      .select('id').eq('profile_id', profileId).eq('role', role).is('revoked_at', null).maybeSingle();
    if (!existing) {
      const { error } = await admin.from('role_grants')
        .insert({ profile_id: profileId, role, chapter_id: chapterId ?? null });
      if (error) return { error: error.message };
    }
  }

  const patch: Record<string, unknown> = { role };
  if (role === 'chapter_lead') patch.lead_chapter_id = chapterId ?? null;
  const { error } = await admin.from('profiles').update(patch).eq('id', profileId);
  if (error) return { error: error.message };
  return { ok: true };
}

/** First-run bootstrap: only works while no admin exists anywhere. */
export async function claimAdmin() {
  const { user } = await requireSession();
  const admin = createAdminClient();

  const { count } = await admin
    .from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin');
  if ((count ?? 0) > 0) return { error: 'An admin already exists. Ask them to grant you access.' };

  const res = await applyRole(user.id, 'admin');
  if (res.error) return res;

  await log(user.id, 'access.bootstrap', user.id, { role: 'admin' });
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Set any account's role from the admin console. */
export async function setAccountRole(profileId: string, role: string) {
  const { profile } = await requireRole('admin');
  if (profileId === profile.id && role !== 'admin') {
    return { error: 'You cannot remove your own admin access.' };
  }
  const valid = ['member', 'student', 'speaker', 'chapter_lead', 'admin'];
  if (!valid.includes(role)) return { error: 'Unknown role' };

  const admin = createAdminClient();
  if (role === 'admin') {
    const { count } = await admin.from('profiles')
      .select('id', { count: 'exact', head: true }).eq('role', 'admin');
    if ((count ?? 0) >= 2) return { error: 'Only two admin accounts are allowed. Demote one first.' };
  }

  const { data: target } = await admin.from('profiles')
    .select('chapter_id').eq('id', profileId).single();

  const res = await applyRole(profileId, role, target?.chapter_id);
  if (res.error) return res;

  await log(profile.id, 'access.set_role', profileId, { role });
  revalidatePath('/admin');
  return { ok: true };
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
