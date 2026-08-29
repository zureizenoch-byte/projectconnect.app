'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireSession } from '@/lib/auth';
import { TAG_CATEGORIES } from '@/lib/types';

const ProfileSchema = z.object({
  pronouns: z.string().max(40).optional(),
  full_name: z.string().min(2).max(120),
  intro: z.string().max(400).optional(),
  role_level: z.string().max(60).optional(),
  employer: z.string().max(120).optional(),
  employer_visible: z.coerce.boolean().optional(),
  city: z.string().max(60).optional(),
  years_experience: z.coerce.number().int().min(0).max(60).optional(),
  budget_owned: z.string().max(60).optional(),
  linkedin_url: z.string().url().optional().or(z.literal('')),
  website_url: z.string().url().optional().or(z.literal('')),
  open_to_mentoring: z.coerce.boolean().optional(),
  seeking_mentor: z.coerce.boolean().optional(),
  is_student: z.coerce.boolean().optional(),
  is_immigrant: z.coerce.boolean().optional(),
  institution: z.string().max(160).optional(),
  programme: z.string().max(160).optional(),
  graduation_year: z.coerce.number().int().min(1970).max(2040).optional(),
  arrival_year: z.coerce.number().int().min(1950).max(2040).optional(),
  home_country: z.string().max(80).optional(),
  credential_recognition: z.string().max(60).optional(),
  work_authorization: z.string().max(80).optional(),
});

export async function saveProfile(formData: FormData) {
  const { user } = await requireSession();
  const raw = Object.fromEntries(formData);
  const parsed = ProfileSchema.partial().safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = createClient();
  const patch: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };
  for (const k of ['linkedin_url', 'website_url']) if (patch[k] === '') patch[k] = null;

  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
  if (error) return { error: error.message };

  // tag groups arrive as repeated fields: tag:domain=Delivery Management
  const rows: { profile_id: string; category: string; value: string; is_custom: boolean }[] = [];
  for (const category of TAG_CATEGORIES) {
    const picked = formData.getAll('tag:' + category).map(String).filter(Boolean);
    const custom = String(formData.get('custom:' + category) ?? '').trim();
    for (const value of picked) {
      if (value === 'Other') continue;
      rows.push({ profile_id: user.id, category, value, is_custom: false });
    }
    if (custom) rows.push({ profile_id: user.id, category, value: custom, is_custom: true });
  }

  await supabase.from('profile_tags').delete().eq('profile_id', user.id);
  if (rows.length) await supabase.from('profile_tags').insert(rows);

  revalidatePath('/profile');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function savePrivacy(formData: FormData) {
  const { user } = await requireSession();
  const supabase = createClient();
  const { error } = await supabase.from('privacy_settings').upsert({
    profile_id: user.id,
    visible_to_members: formData.get('visible_to_members') === 'on',
    allow_contact: formData.get('allow_contact') === 'on',
    show_employer: formData.get('show_employer') === 'on',
    show_city: formData.get('show_city') === 'on',
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  revalidatePath('/profile');
  return { ok: true };
}

export async function uploadPhoto(formData: FormData) {
  const { user } = await requireSession();
  const file = formData.get('photo') as File | null;
  if (!file || file.size === 0) return { error: 'Choose an image first' };
  if (file.size > 5_000_000) return { error: 'Images must be under 5MB' };

  const supabase = createClient();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = user.id + '/avatar.' + ext;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  await supabase.from('profiles').update({ photo_url: data.publicUrl }).eq('id', user.id);
  revalidatePath('/profile');
  return { ok: true };
}

export async function applyForAccess(formData: FormData) {
  const { user, profile, subscription } = await requireSession();
  const kind = String(formData.get('kind'));
  if (kind !== 'speaker' && kind !== 'chapter_lead') return { error: 'Unknown request' };

  // Free members cannot apply to lead a chapter.
  if (kind === 'chapter_lead' && subscription.tier === 'free') {
    return { error: 'Chapter Lead applications are open to paid members.' };
  }

  const supabase = createClient();
  const { error } = await supabase.from('access_requests').insert({
    profile_id: user.id,
    kind,
    chapter_id: profile.chapter_id,
    note: String(formData.get('note') ?? '').slice(0, 1000),
  });
  if (error) return { error: error.message };
  revalidatePath('/profile');
  return { ok: true };
}
