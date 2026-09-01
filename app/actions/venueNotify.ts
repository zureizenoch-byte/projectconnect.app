'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { requireSession, requireRole } from '@/lib/auth';
import { sendEmail, emailEnabled, venueNoticeTemplate } from '@/lib/email';

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://projectconnect.app';
}

/**
 * Let a venue know we intend to meet there.
 *
 * Called automatically when an event is published, and available to admins as
 * a resend. Safe to call repeatedly: one notification row per event and venue,
 * so a venue is never emailed twice for the same meetup.
 */
export async function notifyVenue(eventId: string, force = false) {
  const db = createAdminClient();

  const { data: ev } = await db.from('events')
    .select('id,title,starts_at,seat_cap,venue_id,host_id,created_by,chapter_id,chapters(city)')
    .eq('id', eventId).maybeSingle();
  if (!ev) return { error: 'Event not found' };
  if (!ev.venue_id) return { error: 'This event has no venue yet.' };

  const { data: venue } = await db.from('venues')
    .select('id,name,address,contact_email,contact_name,notify').eq('id', ev.venue_id).maybeSingle();
  if (!venue) return { error: 'Venue not found' };

  const { data: existing } = await db.from('venue_notifications')
    .select('id,status').eq('event_id', eventId).eq('venue_id', venue.id).maybeSingle();

  if (existing && existing.status === 'sent' && !force) {
    return { ok: 'Already sent to this venue.' };
  }

  if (!venue.notify) {
    await db.from('venue_notifications').upsert({
      event_id: eventId, venue_id: venue.id,
      to_email: venue.contact_email ?? 'none',
      subject: '(skipped)', body: '(skipped)',
      status: 'skipped', error: 'Notifications are turned off for this venue.',
    }, { onConflict: 'event_id,venue_id' });
    return { ok: 'This venue is set not to be notified.' };
  }

  if (!venue.contact_email) {
    return { error: 'No contact email on file for ' + venue.name + '. Add one in Admin \u2192 Venues.' };
  }

  const hostId = ev.host_id ?? ev.created_by;
  const { data: host } = hostId
    ? await db.from('profiles').select('full_name,email').eq('id', hostId).maybeSingle()
    : { data: null };

  // The chapter's own lead signs the note; an admin stands in if there is none
  const { data: lead } = await db.from('profiles')
    .select('full_name').eq('lead_chapter_id', ev.chapter_id)
    .eq('role', 'chapter_lead').limit(1).maybeSingle();

  const { data: fallbackAdmin } = lead ? { data: null } : await db.from('profiles')
    .select('full_name').eq('role', 'admin').order('created_at').limit(1).maybeSingle();

  const chapterLeadName = lead?.full_name
    ?? fallbackAdmin?.full_name
    ?? 'the Project Connect team';

  const city = (ev.chapters as any)?.city ?? '';
  const address = venue.address.toLowerCase().includes(city.toLowerCase())
    ? venue.address
    : venue.address + ', ' + city;

  const starts = new Date(ev.starts_at);
  const when = starts.toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'short' });
  const date = starts.toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const time = starts.toLocaleTimeString('en-CA', {
    hour: 'numeric', minute: '2-digit',
  });

  const supportEmail = process.env.EMAIL_REPLY_TO
    ?? process.env.SMTP_USER
    ?? 'hello@projectconnect.app';

  const { subject, text, html } = venueNoticeTemplate({
    venueName: venue.name,
    contactName: venue.contact_name,
    when,
    date,
    time,
    seats: String(ev.seat_cap),
    hostName: host?.full_name ?? 'a Project Connect member',
    chapterLeadName,
    city: city || 'your city',
    supportEmail,
    websiteUrl: siteUrl().replace(/^https?:\/\//, ''),
    eventUrl: siteUrl() + '/events/' + ev.id,
    address,
  });

  const result = await sendEmail({ to: venue.contact_email, subject, html, text });

  await db.from('venue_notifications').upsert({
    event_id: eventId,
    venue_id: venue.id,
    to_email: venue.contact_email,
    subject,
    body: text,
    status: result.ok ? 'sent' : (emailEnabled ? 'failed' : 'queued'),
    error: result.ok ? null : result.error,
    provider_id: result.ok ? (result.id ?? null) : null,
    sent_at: result.ok ? new Date().toISOString() : null,
  }, { onConflict: 'event_id,venue_id' });

  revalidatePath('/admin');

  if (result.ok) return { ok: 'Emailed ' + venue.name + ' at ' + venue.contact_email + '.' };
  if (!emailEnabled) {
    return {
      ok: 'Notice written for ' + venue.name + ', waiting to send. '
        + 'Add your SMTP details to start delivering, then resend from Admin.',
    };
  }
  return { error: 'Could not email ' + venue.name + ': ' + result.error };
}

/** Admin resend, including for anything queued while email was unconfigured. */
export async function resendVenueNotice(eventId: string) {
  await requireRole('admin');
  return notifyVenue(eventId, true);
}

/** Save or change a venue's contact details. */
export async function saveVenueContact(formData: FormData) {
  const { profile } = await requireRole('admin');
  const db = createAdminClient();

  const venueId = String(formData.get('venue_id') ?? '');
  const email = String(formData.get('contact_email') ?? '').trim();
  const name = String(formData.get('contact_name') ?? '').trim();
  const notify = formData.get('notify') !== null;

  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: 'That does not look like an email address.' };
  }

  const { error } = await db.from('venues').update({
    contact_email: email || null,
    contact_name: name || null,
    notify,
  }).eq('id', venueId);
  if (error) return { error: error.message };

  await db.from('audit_log').insert({
    actor_id: profile.id, action: 'venue.contact', target: venueId,
    meta: { email: email || null, notify },
  });

  revalidatePath('/admin');
  return { ok: 'Contact saved.' };
}

/** A host can nudge their own venue if the notice has not gone out. */
export async function notifyMyVenue(eventId: string) {
  const { user, profile } = await requireSession();
  const db = createAdminClient();

  const { data: ev } = await db.from('events')
    .select('host_id,created_by').eq('id', eventId).maybeSingle();
  if (!ev) return { error: 'Event not found' };

  const allowed = profile.role === 'admin'
    || ev.host_id === user.id || ev.created_by === user.id;
  if (!allowed) return { error: 'Only the host or an admin can send this.' };

  return notifyVenue(eventId, false);
}
