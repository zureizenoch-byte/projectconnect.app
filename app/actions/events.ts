'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireSession } from '@/lib/auth';
import { assignTables, selectBalanced, describeMix } from '@/lib/matching';
import { canRunChapter, canHostTalks, isAdmin } from '@/lib/permissions';

/** Promote the longest-waiting person when a seat frees up. */
async function promoteFromWaitlist(eventId: string) {
  const db = createAdminClient();
  const { data: ev } = await db.from('events').select('seat_cap').eq('id', eventId).maybeSingle();
  if (!ev) return;

  const { count } = await db.from('event_seats')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId).eq('status', 'confirmed');
  if ((count ?? 0) >= ev.seat_cap) return;

  const { data: next } = await db.from('event_seats')
    .select('id').eq('event_id', eventId).eq('status', 'waitlist')
    .order('created_at').limit(1).maybeSingle();
  if (next) {
    await db.from('event_seats').update({ status: 'confirmed' }).eq('id', next.id);
  }
}

export async function rsvp(eventId: string) {
  const { user } = await requireSession();
  const supabase = createClient();

  const { data: existing } = await supabase
    .from('event_seats').select('id,status')
    .eq('event_id', eventId).eq('profile_id', user.id).maybeSingle();

  let released = false;

  if (existing) {
    const leaving = existing.status !== 'cancelled';
    const next = leaving ? 'cancelled' : 'confirmed';
    const { error } = await supabase.from('event_seats')
      .update({ status: next }).eq('id', existing.id);
    if (error) return { error: error.message };
    released = leaving && existing.status === 'confirmed';
  } else {
    // First come, first served: take the seat now, or land on the waitlist
    // if the cap is already met (the seat_rules trigger decides).
    const { error } = await supabase.from('event_seats')
      .insert({ event_id: eventId, profile_id: user.id, status: 'confirmed' });
    if (error) return { error: error.message };
  }

  if (released) await promoteFromWaitlist(eventId);

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
 * Group the people who are already coming into tables.
 *
 * Seats are first come, first served — this does not decide who is in. It
 * decides who sits with whom: tables are built to spread domains and role
 * levels, so nobody ends up at an all-one-discipline table. Usable by the
 * host, that chapter's lead, or an admin, and safe to re-run.
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
  if (!allowed) return { error: 'Only the host, chapter lead or an admin can group this event.' };

  const { data: seats } = await db.from('event_seats')
    .select('id,profile_id,created_at')
    .eq('event_id', eventId).eq('status', 'confirmed').order('created_at');
  if (!seats?.length) return { error: 'Nobody is confirmed yet.' };

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
  }));

  // Small groups sit at one table; larger ones split into tables of up to 15.
  const perTable = seats.length <= 15 ? seats.length : 15;
  const assignment = assignTables(candidates, Math.min(4, perTable), perTable);

  for (const [profileId, tableNo] of Object.entries(assignment)) {
    await db.from('event_seats').update({ table_no: tableNo })
      .eq('event_id', eventId).eq('profile_id', profileId);
  }

  const tables = Math.max(1, ...Object.values(assignment));
  const domains = new Set(candidates.flatMap((c) => c.domains));
  const levels = new Set(candidates.map((c) => c.role_level).filter(Boolean));

  await db.from('audit_log').insert({
    actor_id: profile.id, action: 'event.group', target: eventId,
    meta: { people: seats.length, tables },
  });

  revalidatePath('/events');
  revalidatePath('/events/' + eventId);
  revalidatePath('/chapter');
  revalidatePath('/speaker');
  revalidatePath('/dashboard');

  return {
    ok: seats.length + ' people across ' + tables + (tables === 1 ? ' table. ' : ' tables. ')
      + describeMix([...domains] as string[], [...levels] as string[]),
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

  // Free membership covers hosting one meetup per cycle.
  if (!organiser && !isAdmin(profile)) {
    const { isPaid } = await import('@/lib/tiers');
    const db0 = createAdminClient();
    const { data: sub } = await db0.from('subscriptions')
      .select('tier,status,current_period_end').eq('profile_id', profile.id).maybeSingle();
    const paidMember = sub ? isPaid(sub.tier, sub.status, sub.current_period_end) : false;

    if (!paidMember) {
      const cycleStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
      const { count } = await db0.from('events')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', profile.id)
        .neq('status', 'cancelled')
        .gte('starts_at', cycleStart.toISOString());

      if ((count ?? 0) >= 1) {
        return {
          error: 'Free membership covers hosting one meetup per cycle. '
            + 'Upgrade to schedule more, or wait until next month.',
        };
      }
    }
  }
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

  const { data: created, error } = await supabase.from('events').insert({
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
  }).select('id').single();
  if (error) return { error: error.message };

  // Admin-created events publish immediately, so the venue hears now
  if (created?.id && isAdmin(profile)) {
    const { notifyVenue } = await import('@/app/actions/venueNotify');
    await notifyVenue(created.id).catch(() => {});
  }

  // A meetup host is one of the people at the table, so they take a seat.
  // A Speaker Series speaker presents to the room — the seat cap is the
  // audience, so they are listed as the speaker instead of occupying one.
  if (created?.id && kind === 'meetup') {
    const db = createAdminClient();
    await db.from('event_seats').insert({
      event_id: created.id, profile_id: profile.id, status: 'confirmed',
    });
  }

  revalidatePath('/chapter');
  revalidatePath('/speaker');
  revalidatePath('/admin');
  revalidatePath('/events');
  revalidatePath('/dashboard');
  return { ok: true };
}
