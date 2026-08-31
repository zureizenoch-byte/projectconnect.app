'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
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

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function uploadPhoto(formData: FormData) {
  const { user } = await requireSession();
  const file = formData.get('photo') as File | null;

  if (!file || file.size === 0) return { error: 'Choose an image first.' };
  if (!IMAGE_TYPES.includes(file.type)) return { error: 'Use a JPG, PNG, WebP or GIF image.' };
  if (file.size > 5_000_000) return { error: 'Images must be under 5MB.' };

  // service role: storage policies cannot silently swallow the write
  const admin = createAdminClient();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = user.id + '/avatar.' + (ext || 'jpg');

  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });

  if (uploadError) {
    if (/bucket/i.test(uploadError.message)) {
      return { error: 'Storage is not set up: create a public bucket named "avatars" in Supabase.' };
    }
    return { error: 'Upload failed: ' + uploadError.message };
  }

  const { data } = admin.storage.from('avatars').getPublicUrl(path);
  if (!data?.publicUrl) return { error: 'Uploaded, but no public URL came back. Is the bucket public?' };

  // cache-bust so the new photo appears immediately instead of the old one
  const url = data.publicUrl + '?v=' + Date.now();

  const { error: saveError } = await admin.from('profiles')
    .update({ photo_url: url }).eq('id', user.id);
  if (saveError) return { error: 'Saved the image but could not update your profile: ' + saveError.message };

  revalidatePath('/profile');
  revalidatePath('/dashboard');
  return { ok: true, url };
}

export async function removePhoto() {
  const { user } = await requireSession();
  const admin = createAdminClient();
  await admin.storage.from('avatars').remove([
    user.id + '/avatar.jpg', user.id + '/avatar.jpeg',
    user.id + '/avatar.png', user.id + '/avatar.webp', user.id + '/avatar.gif',
  ]);
  await admin.from('profiles').update({ photo_url: null }).eq('id', user.id);
  revalidatePath('/profile');
  revalidatePath('/dashboard');
  return { ok: true };
}

/** Amend a pending application — only your own, and only while it is still pending. */
export async function updateAccessRequest(formData: FormData) {
  const { user } = await requireSession();
  const id = String(formData.get('id') ?? '');
  const note = String(formData.get('note') ?? '').slice(0, 1000);
  if (!id) return { error: 'Missing application' };

  const supabase = createClient();
  const { data: existing } = await supabase
    .from('access_requests').select('id,status').eq('id', id).eq('profile_id', user.id).maybeSingle();
  if (!existing) return { error: 'Application not found' };
  if (existing.status !== 'pending') return { error: 'This application has already been decided.' };

  const { data: updated, error } = await supabase.from('access_requests')
    .update({ note }).eq('id', id).eq('profile_id', user.id).select('id');
  if (error) return { error: error.message };
  if (!updated?.length) return { error: 'Could not save — your application may have just been decided.' };

  revalidatePath('/profile');
  return { ok: true };
}

/** Withdraw a pending application. */
export async function withdrawAccessRequest(id: string) {
  const { user } = await requireSession();
  const supabase = createClient();
  const { error } = await supabase.from('access_requests')
    .delete().eq('id', id).eq('profile_id', user.id).eq('status', 'pending');
  if (error) return { error: error.message };
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
