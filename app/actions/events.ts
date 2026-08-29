'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireSession } from '@/lib/auth';
import { assignTables } from '@/lib/matching';
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

  if (kind === 'talk' && !canHostTalks(profile)) return { error: 'Approved speakers only' };
  if (kind === 'meetup' && !canRunChapter(profile)) return { error: 'Chapter Leads only' };

  const seatCap = Math.min(15, Math.max(12, Number(formData.get('seat_cap') ?? 15)));
  const supabase = createClient();
  const { error } = await supabase.from('events').insert({
    chapter_id: String(formData.get('chapter_id')),
    venue_id: String(formData.get('venue_id') || '') || null,
    host_id: kind === 'talk' ? profile.id : null,
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
  return { ok: true };
}
