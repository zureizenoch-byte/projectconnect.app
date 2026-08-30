'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireSession } from '@/lib/auth';
import { TAG_CATEGORIES } from '@/lib/types';

const blankToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);
const optNum = (min: number, max: number) =>
  z.preprocess((v) => {
    const cleaned = blankToUndefined(v);
    if (cleaned === undefined) return undefined;
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n < min || n > max) return undefined;
    return Math.trunc(n);
  }, z.number().int().optional());
const optStr = (max: number) =>
  z.preprocess((v) => {
    const cleaned = blankToUndefined(v);
    return cleaned === undefined ? undefined : String(cleaned).slice(0, max);
  }, z.string().optional());
const optUrl = () =>
  z.preprocess((v) => {
    const cleaned = blankToUndefined(v);
    if (cleaned === undefined) return undefined;
    const s = String(cleaned).trim();
    return /^https?:\/\//i.test(s) ? s : undefined;
  }, z.string().optional());

const ProfileSchema = z.object({
  pronouns: optStr(40),
  full_name: optStr(120),
  intro: optStr(400),
  role_level: optStr(60),
  employer: optStr(120),
  city: optStr(60),
  years_experience: optNum(0, 60),
  budget_owned: optStr(60),
  linkedin_url: optUrl(),
  website_url: optUrl(),
  institution: optStr(160),
  programme: optStr(160),
  graduation_year: optNum(1970, 2040),
  arrival_year: optNum(1950, 2040),
  home_country: optStr(80),
  credential_recognition: optStr(60),
  work_authorization: optStr(80),
});

const CHECKBOXES = ['employer_visible', 'open_to_mentoring', 'seeking_mentor', 'is_student', 'is_immigrant'] as const;

export async function saveProfile(formData: FormData) {
  const { user } = await requireSession();
  const raw = Object.fromEntries(formData);
  const parsed = ProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: String(issue.path[0] ?? 'field') + ': ' + issue.message };
  }

  const supabase = createClient();
  const patch: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };

  // unchecked boxes are absent from FormData — write them as false, not undefined
  for (const k of CHECKBOXES) patch[k] = formData.get(k) === 'on';

  // never overwrite a saved value with undefined
  for (const k of Object.keys(patch)) if (patch[k] === undefined) delete patch[k];

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
