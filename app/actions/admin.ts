'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireRole, requireSession } from '@/lib/auth';
import { bootstrapEmails } from '@/lib/bootstrap';

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

  const patch: Record<string, unknown> = {
    role,
    speaker_approved: role === 'speaker',
    lead_chapter_id: role === 'chapter_lead' ? (chapterId ?? null) : null,
  };
  const { error } = await admin.from('profiles').update(patch).eq('id', profileId);
  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * First-run bootstrap. Two locks: no admin may exist yet, and the signed-in
 * email must be on the ADMIN_BOOTSTRAP_EMAILS allowlist. After the first admin
 * exists, admin access can only be granted by an existing admin.
 */
export async function claimAdmin() {
  const { user, profile } = await requireSession();
  const admin = createAdminClient();

  const allowed = bootstrapEmails();
  if (allowed.length === 0) {
    return { error: 'Bootstrap is closed. Set ADMIN_BOOTSTRAP_EMAILS to enable it.' };
  }
  if (!allowed.includes(profile.email.toLowerCase())) {
    return { error: 'This account is not on the bootstrap allowlist.' };
  }

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
  const { profile } = await requireRole('admin');
  const admin = createAdminClient();

  const { data: req } = await admin.from('access_requests').select('*').eq('id', requestId).maybeSingle();
  if (!req) return { error: 'Request not found' };
  if (req.status !== 'pending') return { error: 'This request has already been decided.' };

  const { error: decideError } = await admin.from('access_requests').update({
    status: approve ? 'approved' : 'rejected',
    decided_by: profile.id,
    decided_at: new Date().toISOString(),
  }).eq('id', requestId);
  if (decideError) return { error: decideError.message };

  if (approve) {
    // Chapter Leads pay like members — the role assumes an active plan
    if (req.kind === 'chapter_lead') {
      const { data: sub } = await admin.from('subscriptions')
        .select('tier,status,current_period_end').eq('profile_id', req.profile_id).maybeSingle();
      const { isPaid } = await import('@/lib/tiers');
      const paid = sub ? isPaid(sub.tier, sub.status, sub.current_period_end) : false;

      if (!paid) {
        // leave the request pending so it can be approved once they subscribe
        await admin.from('access_requests').update({
          status: 'pending', decided_by: null, decided_at: null,
        }).eq('id', requestId);
        return {
          error: 'Chapter Lead access needs an active paid plan. Ask them to subscribe, '
            + 'then approve this again — the application stays in the queue.',
        };
      }
    }

    const res = await applyRole(req.profile_id, req.kind, req.chapter_id);
    if (res.error) return res;
  }

  await log(profile.id, approve ? 'access.approve' : 'access.reject', req.profile_id, { kind: req.kind });
  revalidatePath('/admin');
  revalidatePath('/profile');
  return { ok: true };
}

/** Revoke any elevated role — speaker, chapter_lead or admin. */
export async function revokeRole(profileId: string, role: 'speaker' | 'chapter_lead' | 'admin') {
  const { profile } = await requireRole('admin');
  if (profileId === profile.id) {
    return { error: 'You cannot revoke your own admin access.' };
  }
  const res = await applyRole(profileId, 'member');
  if (res.error) return res;

  await log(profile.id, 'access.revoke', profileId, { role });
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
  const patch: Record<string, unknown> = {
    role,
    speaker_approved: role === 'speaker',
    lead_chapter_id: role === 'chapter_lead' ? target.chapter_id : null,
  };
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

  // Publishing is the moment the venue should hear from us
  if (status === 'published') {
    const { notifyVenue } = await import('@/app/actions/venueNotify');
    await notifyVenue(eventId).catch(() => {});
  }

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
    contact_email: String(formData.get('contact_email') ?? '').trim() || null,
    contact_name: String(formData.get('contact_name') ?? '').trim() || null,
    website: String(formData.get('website') ?? '').trim() || null,
    phone: String(formData.get('phone') ?? '').trim() || null,
    photo_url: String(formData.get('photo_url') ?? '').trim() || null,
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

export async function resolveMessageReport(reportId: string, alsoSuspend = false) {
  const { profile } = await requireRole('admin');
  const admin = createAdminClient();

  const { data: rep } = await admin.from('message_reports')
    .select('id,reported_id').eq('id', reportId).maybeSingle();
  if (!rep) return { error: 'Report not found' };

  await admin.from('message_reports').update({
    resolved: true, resolved_by: profile.id, resolved_at: new Date().toISOString(),
  }).eq('id', reportId);

  await log(profile.id, 'message_report.resolve', reportId, { suspended: alsoSuspend });
  revalidatePath('/admin');
  return { ok: true };
}

/**
 * Retire or restore a venue. Venues attached to past events are deactivated
 * rather than deleted, so event history keeps its location.
 */
export async function setVenueActive(venueId: string, active: boolean) {
  const { profile } = await requireRole('admin');
  const admin = createAdminClient();
  const { error } = await admin.from('venues').update({ active }).eq('id', venueId);
  if (error) return { error: error.message };
  await log(profile.id, active ? 'venue.restore' : 'venue.retire', venueId);
  revalidatePath('/admin');
  revalidatePath('/venues');
  return { ok: true };
}

/** How many events reference a venue — used to warn before deleting. */
export async function venueUsage(venueId: string) {
  await requireRole('admin');
  const admin = createAdminClient();
  const { count } = await admin.from('events')
    .select('id', { count: 'exact', head: true }).eq('venue_id', venueId);
  return { count: count ?? 0 };
}

/**
 * Delete a venue. With force, any events pointing at it are detached first
 * (their venue becomes "to be confirmed") rather than being deleted.
 */
export async function deleteVenue(venueId: string, force = false) {
  const { profile } = await requireRole('admin');
  const admin = createAdminClient();

  const { count } = await admin.from('events')
    .select('id', { count: 'exact', head: true }).eq('venue_id', venueId);

  if ((count ?? 0) > 0) {
    if (!force) {
      return {
        error: (count ?? 0) + ' event(s) use this venue.',
        usedBy: count ?? 0,
      };
    }
    const { error: detachError } = await admin.from('events')
      .update({ venue_id: null }).eq('venue_id', venueId);
    if (detachError) return { error: 'Could not detach events: ' + detachError.message };
  }

  const { error } = await admin.from('venues').delete().eq('id', venueId);
  if (error) return { error: 'Delete failed: ' + error.message };

  await log(profile.id, 'venue.delete', venueId, { detached: count ?? 0 });
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
