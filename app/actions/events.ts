'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireSession } from '@/lib/auth';
import { assignTables, selectBalanced, describeMix } from '@/lib/matching';
import { canRunChapter, canHostTalks, isAdmin } from '@/lib/permissions';

export async function rsvp(eventId: string) {
  const { user } = await requireSession();
  const supabase = createClient();

  const { data: existing } = await supabase
    .from('event_seats').select('id,status')
    .eq('event_id', eventId).eq('profile_id', user.id).maybeSingle();

  if (existing) {
    const next = existing.status === 'cancelled' ? 'requested' : 'cancelled';
    const { error } = await supabase.from('event_seats')
      .update({ status: next }).eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('event_seats')
      .insert({ event_id: eventId, profile_id: user.id, status: 'requested' });
    // seat rules live in the database — surface its message verbatim
    if (error) return { error: error.message };
  }

  revalidatePath('/events');
  revalidatePath('/events/' + eventId);
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function setSeatStatus(seatId: string, status: 'confirmed' | 'waitlist' | 'cancelled') {
  const { profile } = await requireSession();
  const supabase = createClient();

  const { data: seat } = await supabase
    .from('event_seats').select('id,event_id,events(chapter_id,host_id,kind)')
    .eq('id', seatId).single();
  if (!seat) return { error: 'Seat not found' };

  const ev = seat.events as unknown as { chapter_id: string; host_id: string | null; kind: string };
  const allowed = isAdmin(profile)
    || (canRunChapter(profile) && profile.lead_chapter_id === ev.chapter_id)
    || (canHostTalks(profile) && ev.host_id === profile.id);
  if (!allowed) return { error: 'Not your event' };

  const { error } = await supabase.from('event_seats').update({ status }).eq('id', seatId);
  if (error) return { error: error.message };

  revalidatePath('/speaker');
  revalidatePath('/chapter');
  revalidatePath('/events/' + seat.event_id);
  return { ok: true };
}

/** Automatic first pass; a Chapter Lead can override any table number afterwards. */
export async function autoMatch(eventId: string) {
  const { profile } = await requireSession();
  if (!canRunChapter(profile)) return { error: 'Chapter Leads and admins only' };

  const supabase = createClient();
  const { data: seats } = await supabase
    .from('event_seats')
    .select('profile_id, profiles(role_level), profile_tags:profiles(profile_tags(category,value))')
    .eq('event_id', eventId).eq('status', 'confirmed');
  if (!seats?.length) return { error: 'No confirmed attendees yet' };

  const candidates = seats.map((s: any) => ({
    profile_id: s.profile_id,
    role_level: s.profiles?.role_level ?? null,
    domains: (s.profile_tags?.profile_tags ?? [])
      .filter((t: any) => t.category === 'domain').map((t: any) => t.value),
  }));

  const assignment = assignTables(candidates);
  const admin = createAdminClient();
  for (const [profileId, tableNo] of Object.entries(assignment)) {
    await admin.from('event_seats').update({ table_no: tableNo })
      .eq('event_id', eventId).eq('profile_id', profileId);
  }

  revalidatePath('/chapter');
  revalidatePath('/events/' + eventId);
  return { ok: true, tables: Math.max(...Object.values(assignment)) };
}

/**
 * Seat a coffee meetup by mix rather than by arrival. Usable by the host,
 * that chapter's lead, or an admin. Confirms a balanced set up to the seat
 * cap and waitlists the rest; everyone is notified by the seat trigger.
 */
export async function matchAttendees(eventId: string) {
  const { profile } = await requireSession();
  const db = createAdminClient();

  const { data: ev } = await db.from('events')
    .select('id,title,seat_cap,chapter_id,host_id,created_by').eq('id', eventId).maybeSingle();
  if (!ev) return { error: 'Event not found' };

  const allowed = isAdmin(profile)
    || ev.host_id === profile.id
    || ev.created_by === profile.id
    || (canRunChapter(profile) && profile.lead_chapter_id === ev.chapter_id);
  if (!allowed) return { error: 'Only the host, chapter lead or an admin can seat this event.' };

  const { data: seats } = await db.from('event_seats')
    .select('id,profile_id,status,created_at')
    .eq('event_id', eventId).in('status', ['requested', 'confirmed', 'waitlist']);
  if (!seats?.length) return { error: 'Nobody has asked for a seat yet.' };

  const ids = seats.map((s: any) => s.profile_id);
  const [{ data: people }, { data: tags }] = await Promise.all([
    db.from('profiles').select('id,role_level').in('id', ids),
    db.from('profile_tags').select('profile_id,value').eq('category', 'domain').in('profile_id', ids),
  ]);

  const levelOf = new Map((people ?? []).map((p: any) => [p.id, p.role_level]));
  const domainsOf = new Map<string, string[]>();
  for (const t of tags ?? []) {
    if (!domainsOf.has(t.profile_id)) domainsOf.set(t.profile_id, []);
    domainsOf.get(t.profile_id)!.push(t.value);
  }

  const candidates = seats.map((s: any) => ({
    profile_id: s.profile_id,
    role_level: levelOf.get(s.profile_id) ?? null,
    domains: domainsOf.get(s.profile_id) ?? [],
    requested_at: s.created_at,
  }));

  const result = selectBalanced(candidates, ev.seat_cap);

  for (const pid of result.confirmed) {
    await db.from('event_seats').update({ status: 'confirmed' })
      .eq('event_id', eventId).eq('profile_id', pid);
  }
  for (const pid of result.waitlisted) {
    await db.from('event_seats').update({ status: 'waitlist' })
      .eq('event_id', eventId).eq('profile_id', pid);
  }

  await db.from('audit_log').insert({
    actor_id: profile.id, action: 'event.match', target: eventId,
    meta: { confirmed: result.confirmed.length, waitlisted: result.waitlisted.length },
  });

  revalidatePath('/events');
  revalidatePath('/events/' + eventId);
  revalidatePath('/chapter');
  revalidatePath('/speaker');
  revalidatePath('/dashboard');

  return {
    ok: result.confirmed.length + ' seated, ' + result.waitlisted.length + ' waitlisted. '
      + describeMix(result.domains, result.levels),
  };
}

export async function setTable(seatId: string, tableNo: number | null) {
  const { profile } = await requireSession();
  if (!canRunChapter(profile)) return { error: 'Chapter Leads and admins only' };
  const supabase = createClient();
  const { error } = await supabase.from('event_seats').update({ table_no: tableNo }).eq('id', seatId);
  if (error) return { error: error.message };
  revalidatePath('/chapter');
  return { ok: true };
}

export async function createEvent(formData: FormData) {
  const { profile } = await requireSession();
  const kind = String(formData.get('kind') ?? 'meetup') as 'meetup' | 'talk';

  if (kind === 'talk' && !canHostTalks(profile)) {
    return { error: 'Speaker Series talks are hosted by approved speakers.' };
  }
  // Any member may propose a coffee meetup; it goes to an admin for approval.
  // Chapter Leads and admins run the larger matched meetups.
  const organiser = canRunChapter(profile);
  const minSeats = organiser ? 12 : 2;
  const seatCap = Math.min(15, Math.max(minSeats, Number(formData.get('seat_cap') ?? (organiser ? 15 : 6))));
  const supabase = createClient();
  const chapterId = String(formData.get('chapter_id'));

  // "Add a new venue" creates the venue first, so it can be reused next time
  let venueId: string | null = String(formData.get('venue_id') || '') || null;
  if (venueId === '__new') {
    const name = String(formData.get('new_venue_name') ?? '').trim().slice(0, 160);
    const address = String(formData.get('new_venue_address') ?? '').trim().slice(0, 300);
    if (!name || !address) return { error: 'Give the new venue a name and an address.' };

    const admin = createAdminClient();
    const { data: venue, error: venueError } = await admin.from('venues').insert({
      chapter_id: chapterId,
      name,
      address,
      maps_query: address,
      capacity: seatCap,
    }).select('id').single();
    if (venueError) return { error: 'Could not save the venue: ' + venueError.message };
    venueId = venue.id;
  }

  const { error } = await supabase.from('events').insert({
    chapter_id: chapterId,
    venue_id: venueId,
    host_id: kind === 'talk' || !organiser ? profile.id : null,
    created_by: profile.id,
    kind,
    title: String(formData.get('title') ?? '').slice(0, 200),
    description: String(formData.get('description') ?? '').slice(0, 4000),
    starts_at: new Date(String(formData.get('starts_at'))).toISOString(),
    seat_cap: seatCap,
    // Chapter Lead creates, admin approves before publishing
    status: isAdmin(profile) ? 'published' : 'pending',
    published_at: isAdmin(profile) ? new Date().toISOString() : null,
  });
  if (error) return { error: error.message };

  revalidatePath('/chapter');
  revalidatePath('/speaker');
  revalidatePath('/admin');
  revalidatePath('/events');
  revalidatePath('/dashboard');
  return { ok: true };
}
