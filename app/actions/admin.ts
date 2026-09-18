'use server';

import { eventDate, zonedToUtcIso } from '@/lib/eventTime';
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
  const who = String(formData.get('email') ?? '').trim();
  const role = String(formData.get('role') ?? '');
  if (!who) return { error: 'Enter a name or email address' };
  if (!['speaker', 'chapter_lead', 'admin'].includes(role)) return { error: 'Pick a role' };

  const admin = createAdminClient();

  // The field takes a name or an email — an admin knows people by name.
  let target: { id: string; chapter_id: string | null } | null = null;

  if (who.includes('@')) {
    const { data } = await admin.from('profiles')
      .select('id,chapter_id').ilike('email', who.toLowerCase()).maybeSingle();
    target = data ?? null;
  } else {
    const { data } = await admin.from('profiles')
      .select('id,chapter_id,full_name').ilike('full_name', '%' + who + '%').limit(2);
    if ((data?.length ?? 0) > 1) {
      return { error: 'More than one member matches that name — pick them from the list instead.' };
    }
    target = data?.[0] ?? null;
  }

  if (!target) return { error: 'No account matches that. They need to sign up first.' };

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

  await log(profile.id, 'access.grant', target.id, { role, who });
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

/**
 * Close a reported message.
 *
 * Two outcomes, because "resolved" alone says nothing: dismiss it, or uphold it
 * and warn the member. A warning names the rule, not the reporter — a member
 * who reports someone should not be identifiable by what happens next.
 *
 * Warnings accumulate. The count goes in the notification so a second warning
 * reads as a second warning, not a first one repeated.
 */
export async function resolveMessageReport(reportId: string, uphold = false, note = '') {
  const { profile } = await requireRole('admin');
  const admin = createAdminClient();

  const { data: rep } = await admin.from('message_reports')
    .select('id,reported_id,reason,resolved').eq('id', reportId).maybeSingle();
  if (!rep) return { error: 'Report not found' };
  if (rep.resolved) return { error: 'That report has already been closed.' };

  await admin.from('message_reports').update({
    resolved: true,
    resolved_by: profile.id,
    resolved_at: new Date().toISOString(),
    upheld: uphold,
    resolution_note: note.trim().slice(0, 600) || null,
  }).eq('id', reportId);

  let warnings = 0;

  if (uphold && rep.reported_id) {
    const { count } = await admin.from('message_reports')
      .select('id', { count: 'exact', head: true })
      .eq('reported_id', rep.reported_id).eq('upheld', true);
    warnings = count ?? 1;

    const nth = warnings === 1 ? 'a warning'
      : warnings === 2 ? 'a second warning'
        : 'warning number ' + warnings;

    // The admin's own words carry further than boilerplate, so they lead.
    const explanation = note.trim().slice(0, 600);

    await admin.from('notifications').insert({
      profile_id: rep.reported_id,
      kind: 'moderation.warning',
      title: warnings === 1
        ? 'A message you sent was reported'
        : 'Another message you sent was reported',
      body: (explanation ? explanation + '\n\n' : '')
        + 'An admin reviewed it and agreed it broke our conduct rules, so this is '
        + nth + '. Project Connect is for professional conversation — keep messages '
        + 'civil, relevant, and free of unsolicited sales.'
        + (warnings >= 3 ? ' Further reports may cost you your account.' : ''),
      href: '/legal/terms',
    });
  }

  await log(profile.id, uphold ? 'message_report.uphold' : 'message_report.dismiss',
    reportId, { reported_id: rep.reported_id, warnings, note: note.trim().slice(0, 600) || null });

  revalidatePath('/admin');
  return {
    ok: uphold
      ? 'Upheld. The member has been warned' + (warnings > 1 ? ' (' + warnings + ' total).' : '.')
      : 'Dismissed. Nobody was warned.',
  };
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

/**
 * Book a speaker: pick someone from the approved pool, a topic and a place,
 * and the talk goes straight onto the calendar with them as host.
 *
 * An admin booking is published immediately — there is nobody above them to
 * approve it — so the venue notice fires here rather than on a later publish.
 */
export async function bookSpeaker(formData: FormData) {
  const { profile } = await requireRole('admin');
  const admin = createAdminClient();

  const speakerId = String(formData.get('speaker_id') ?? '');
  const topic = String(formData.get('topic') ?? '').trim().slice(0, 200);
  const startsAt = String(formData.get('starts_at') ?? '');
  const chapterId = String(formData.get('chapter_id') ?? '');
  const format = String(formData.get('format') ?? 'in_person') === 'online' ? 'online' : 'in_person';

  if (!speakerId) return { error: 'Pick a speaker from the pool.' };
  if (!topic) return { error: 'Give the talk a topic.' };
  if (!startsAt) return { error: 'Pick a date and time.' };
  if (!chapterId) return { error: 'Pick a chapter.' };

  const { data: speaker } = await admin.from('profiles')
    .select('id,full_name,role,speaker_approved').eq('id', speakerId).maybeSingle();
  if (!speaker) return { error: 'That speaker no longer has an account.' };
  if (speaker.role !== 'speaker' && speaker.role !== 'admin') {
    return { error: (speaker.full_name ?? 'That person') + ' is not an approved speaker.' };
  }

  const meetingUrl = String(formData.get('meeting_url') ?? '').trim();
  if (format === 'online' && !/^https?:\/\//i.test(meetingUrl)) {
    return { error: 'An online talk needs a meeting link starting with https://' };
  }

  const venueId = format === 'online' ? null : (String(formData.get('venue_id') ?? '') || null);
  const ceiling = format === 'online' ? 100 : 15;
  const rawSeats = Number(formData.get('seat_cap') ?? 15);
  const seatCap = Math.min(ceiling, Math.max(2, Number.isFinite(rawSeats) ? rawSeats : 15));

  const { data: chapterRow } = await admin.from('chapters')
    .select('city').eq('id', chapterId).maybeSingle();
  const chapterCity = chapterRow?.city ?? null;

  // the admin types the chapter's clock, not their own
  const iso = zonedToUtcIso(startsAt, chapterCity);

  // Two talks by the same speaker at once would be a double booking
  const { data: clash } = await admin.from('events')
    .select('id,title,starts_at').eq('host_id', speakerId).eq('kind', 'talk')
    .neq('status', 'cancelled')
    .gte('starts_at', new Date(new Date(iso).getTime() - 2 * 3600_000).toISOString())
    .lte('starts_at', new Date(new Date(iso).getTime() + 2 * 3600_000).toISOString())
    .maybeSingle();
  if (clash) {
    return {
      error: (speaker.full_name ?? 'That speaker') + ' already has "' + clash.title
        + '" within two hours of that time.',
    };
  }

  const { data: created, error } = await admin.from('events').insert({
    chapter_id: chapterId,
    venue_id: venueId,
    host_id: speakerId,
    created_by: profile.id,
    kind: 'talk',
    title: topic,
    description: String(formData.get('description') ?? '').slice(0, 4000) || null,
    starts_at: iso,
    seat_cap: seatCap,
    format,
    meeting_url: format === 'online' ? meetingUrl : null,
    meeting_note: format === 'online'
      ? String(formData.get('meeting_note') ?? '').slice(0, 300) || null
      : null,
    status: 'published',
    published_at: new Date().toISOString(),
  }).select('id').single();

  if (error) return { error: error.message };

  // Tell the speaker they have been booked — they did not ask for this
  await admin.from('notifications').insert({
    profile_id: speakerId,
    kind: 'event.booked',
    title: 'You are booked to speak',
    body: topic + ' · ' + eventDate(iso, chapterCity),
    href: '/events/' + created.id,
    actor_id: profile.id,
  });

  if (venueId) {
    const { notifyVenue } = await import('@/app/actions/venueNotify');
    await notifyVenue(created.id).catch(() => {});
  }

  await log(profile.id, 'speaker.book', created.id, { speaker_id: speakerId, topic });

  revalidatePath('/admin');
  revalidatePath('/events');
  revalidatePath('/speaker');
  return { ok: 'Booked. ' + (speaker.full_name ?? 'The speaker') + ' has been notified.' };
}
