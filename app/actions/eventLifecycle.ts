'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { requireSession } from '@/lib/auth';
import { canRunChapter, canHostTalks, isAdmin } from '@/lib/permissions';

/** Who may change an event: its host, that chapter's lead, or an admin. */
async function assertCanManage(eventId: string) {
  const { profile } = await requireSession();
  const db = createAdminClient();
  const { data: ev } = await db.from('events')
    .select('id,title,starts_at,chapter_id,host_id,status,venue_id').eq('id', eventId).maybeSingle();
  if (!ev) return { error: 'Event not found' as const };

  const allowed = isAdmin(profile)
    || (canRunChapter(profile) && profile.lead_chapter_id === ev.chapter_id)
    || (canHostTalks(profile) && ev.host_id === profile.id);
  if (!allowed) return { error: 'You cannot change this event' as const };

  return { ev, profile, db };
}

function whenText(iso: string) {
  return new Date(iso).toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'short' });
}

/** Move an event to a new date, telling everyone who holds a seat. */
export async function rescheduleEvent(formData: FormData) {
  const eventId = String(formData.get('event_id') ?? '');
  const newStart = String(formData.get('starts_at') ?? '');
  const note = String(formData.get('note') ?? '').slice(0, 500);
  if (!newStart) return { error: 'Pick a new date and time.' };

  const ctx = await assertCanManage(eventId);
  if ('error' in ctx) return ctx;
  const { ev, profile, db } = ctx;

  const iso = new Date(newStart).toISOString();

  const { error } = await db.from('events').update({
    starts_at: iso,
    original_starts_at: ev.original_starts_at ?? ev.starts_at,
    status: 'published',
    status_note: note || null,
    status_changed_at: new Date().toISOString(),
    status_changed_by: profile.id,
  }).eq('id', eventId);
  if (error) return { error: error.message };

  await db.from('event_changes').insert({
    event_id: eventId, kind: 'rescheduled',
    from_starts_at: ev.starts_at, to_starts_at: iso,
    note: note || null, actor_id: profile.id,
  });

  await db.rpc('notify_event_attendees', {
    ev_id: eventId,
    n_kind: 'event.rescheduled',
    n_title: ev.title + ' has moved',
    n_body: 'Now ' + whenText(iso) + (note ? ' — ' + note : '') + '. Your seat carries over.',
    actor: profile.id,
  });

  revalidatePath('/events');
  revalidatePath('/chapter');
  revalidatePath('/speaker');
  revalidatePath('/admin');
  return { ok: 'Moved, and everyone holding a seat has been told.' };
}

/** Take an event off the calendar without losing its seats. */
export async function postponeEvent(formData: FormData) {
  const eventId = String(formData.get('event_id') ?? '');
  const note = String(formData.get('note') ?? '').slice(0, 500);

  const ctx = await assertCanManage(eventId);
  if ('error' in ctx) return ctx;
  const { ev, profile, db } = ctx;

  const { error } = await db.from('events').update({
    status: 'postponed',
    original_starts_at: ev.original_starts_at ?? ev.starts_at,
    status_note: note || null,
    status_changed_at: new Date().toISOString(),
    status_changed_by: profile.id,
  }).eq('id', eventId);
  if (error) return { error: error.message };

  await db.from('event_changes').insert({
    event_id: eventId, kind: 'postponed',
    from_starts_at: ev.starts_at, note: note || null, actor_id: profile.id,
  });

  await db.rpc('notify_event_attendees', {
    ev_id: eventId,
    n_kind: 'event.postponed',
    n_title: ev.title + ' is postponed',
    n_body: (note || 'A new date will be announced.') + ' Your seat is held.',
    actor: profile.id,
  });

  revalidatePath('/events');
  revalidatePath('/chapter');
  revalidatePath('/speaker');
  return { ok: 'Postponed. Seats are held and everyone has been told.' };
}

export async function cancelEvent(formData: FormData) {
  const eventId = String(formData.get('event_id') ?? '');
  const note = String(formData.get('note') ?? '').slice(0, 500);

  const ctx = await assertCanManage(eventId);
  if ('error' in ctx) return ctx;
  const { ev, profile, db } = ctx;

  await db.rpc('notify_event_attendees', {
    ev_id: eventId,
    n_kind: 'event.cancelled',
    n_title: ev.title + ' is cancelled',
    n_body: note || 'Sorry — this one is off. Your seat has been released.',
    actor: profile.id,
  });

  const { error } = await db.from('events').update({
    status: 'cancelled',
    status_note: note || null,
    status_changed_at: new Date().toISOString(),
    status_changed_by: profile.id,
  }).eq('id', eventId);
  if (error) return { error: error.message };

  await db.from('event_seats').update({ status: 'cancelled' }).eq('event_id', eventId);

  await db.from('event_changes').insert({
    event_id: eventId, kind: 'cancelled',
    from_starts_at: ev.starts_at, note: note || null, actor_id: profile.id,
  });

  revalidatePath('/events');
  revalidatePath('/chapter');
  revalidatePath('/speaker');
  return { ok: 'Cancelled, and everyone has been told.' };
}

/** Bring a postponed or cancelled event back, on a new date. */
export async function restoreEvent(formData: FormData) {
  const eventId = String(formData.get('event_id') ?? '');
  const newStart = String(formData.get('starts_at') ?? '');
  if (!newStart) return { error: 'Pick the new date and time.' };

  const ctx = await assertCanManage(eventId);
  if ('error' in ctx) return ctx;
  const { ev, profile, db } = ctx;

  const iso = new Date(newStart).toISOString();
  const { error } = await db.from('events').update({
    status: 'published', starts_at: iso, status_note: null,
    status_changed_at: new Date().toISOString(), status_changed_by: profile.id,
  }).eq('id', eventId);
  if (error) return { error: error.message };

  await db.from('event_changes').insert({
    event_id: eventId, kind: 'restored',
    from_starts_at: ev.starts_at, to_starts_at: iso, actor_id: profile.id,
  });

  await db.rpc('notify_event_attendees', {
    ev_id: eventId,
    n_kind: 'event.restored',
    n_title: ev.title + ' is back on',
    n_body: whenText(iso) + '. Your seat is still yours.',
    actor: profile.id,
  });

  revalidatePath('/events');
  revalidatePath('/chapter');
  return { ok: 'Back on the calendar.' };
}

/**
 * Permanently remove an event. Admins only — Chapter Leads cancel instead,
 * so the record and its history survive.
 */
export async function deleteEvent(formData: FormData) {
  const { profile } = await requireSession();
  if (!isAdmin(profile)) return { error: 'Admins only. Cancel it instead to keep the record.' };

  const eventId = String(formData.get('event_id') ?? '');
  const note = String(formData.get('note') ?? '').slice(0, 500);
  const db = createAdminClient();

  const { data: ev } = await db.from('events')
    .select('id,title,starts_at').eq('id', eventId).maybeSingle();
  if (!ev) return { error: 'Event not found' };

  // tell people before the seats disappear
  await db.rpc('notify_event_attendees', {
    ev_id: eventId,
    n_kind: 'event.cancelled',
    n_title: ev.title + ' has been removed',
    n_body: note || 'This event is no longer going ahead. Your seat has been released.',
    actor: profile.id,
  });

  await db.from('audit_log').insert({
    actor_id: profile.id, action: 'event.delete', target: eventId,
    meta: { title: ev.title, starts_at: ev.starts_at, note: note || null },
  });

  // seats, changes and reports cascade with the event row
  const { error } = await db.from('events').delete().eq('id', eventId);
  if (error) return { error: 'Delete failed: ' + error.message };

  revalidatePath('/events');
  revalidatePath('/chapter');
  revalidatePath('/speaker');
  revalidatePath('/admin');
  revalidatePath('/dashboard');
  return { ok: 'Event deleted, and everyone holding a seat has been told.' };
}
