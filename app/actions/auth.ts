'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { TAG_CATEGORIES } from '@/lib/types';
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from '@/lib/legal';
import { DISCLAIMER_VERSION } from '@/lib/disclaimer';

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, 'Use at least 8 characters')
    .max(20, 'Use no more than 20 characters')
    .regex(/^[A-Za-z0-9]+$/, 'Letters and numbers only')
    .regex(/[a-zA-Z]/, 'Include at least one letter')
    .regex(/[0-9]/, 'Include at least one number'),
  confirm: z.string(),
  full_name: z.string().min(2),
  pronouns: z.string().optional(),
  role: z.enum(['member', 'student', 'speaker']),
  city: z.string().min(2),
  is_immigrant: z.coerce.boolean().optional(),
  agree: z.literal('on', { errorMap: () => ({ message: 'You must agree to the Terms and Privacy Policy' }) }),
  disclaimer: z.literal('on', { errorMap: () => ({ message: 'You must agree to the Member Disclaimer' }) }),
  intro: z.string().max(400).optional(),
  role_level: z.string().max(60).optional(),
  employer: z.string().max(120).optional(),
  years_experience: z.string().optional(),
  linkedin_url: z.string().optional(),
}).refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export type ActionState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean; checkEmail?: string };

/** Prefer the real request host over a stale env var, so email links never point at a dead domain. */
function siteUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  const host = headers().get('x-forwarded-host') ?? headers().get('host');
  if (host && !host.startsWith('localhost')) {
    const proto = headers().get('x-forwarded-proto') ?? 'https';
    return proto + '://' + host;
  }
  return env ?? 'http://localhost:3000';
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = SignupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors };
  }
  const d = parsed.data;
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email: d.email,
    password: d.password,
    options: {
      emailRedirectTo: siteUrl() + '/auth/callback',
      data: {
        full_name: d.full_name,
        pronouns: d.pronouns ?? null,
        role: d.role,
        city: d.city,
        is_student: d.role === 'student',
        is_immigrant: !!d.is_immigrant,
      },
    },
  });
  if (error) return { error: error.message };

  // The profile row is created by a trigger on the new auth user; fill in the
  // rest of it here so signup and profile setup are genuinely one step. Service
  // role, because with email confirmation on there is no session to write with.
  if (data.user) {
    const admin = createAdminClient();
    const userId = data.user.id;

    const num = (v?: string) => {
      if (!v) return undefined;
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 && n <= 60 ? Math.trunc(n) : undefined;
    };
    const url = (v?: string) => (v && /^https?:\/\//i.test(v.trim()) ? v.trim() : undefined);

    const patch: Record<string, unknown> = {
      intro: d.intro?.trim() || null,
      role_level: d.role_level?.trim() || null,
      employer: d.employer?.trim() || null,
      years_experience: num(d.years_experience) ?? null,
      linkedin_url: url(d.linkedin_url) ?? null,
      updated_at: new Date().toISOString(),
    };
    await admin.from('profiles').update(patch).eq('id', userId);

    // experience tags, same shape the profile form posts
    const rows: { profile_id: string; category: string; value: string; is_custom: boolean }[] = [];
    for (const category of TAG_CATEGORIES) {
      for (const value of formData.getAll('tag:' + category).map(String).filter(Boolean)) {
        if (value === 'Other') continue;
        rows.push({ profile_id: userId, category, value, is_custom: false });
      }
      const custom = String(formData.get('custom:' + category) ?? '').trim();
      if (custom) rows.push({ profile_id: userId, category, value: custom, is_custom: true });
    }
    if (rows.length) await admin.from('profile_tags').insert(rows);

    // photo, if they chose one
    const photo = formData.get('photo') as File | null;
    if (photo && photo.size > 0 && photo.size <= 5_000_000) {
      const ext = (photo.name.split('.').pop() ?? 'jpg').toLowerCase().slice(0, 5);
      const path = userId + '/avatar.' + ext;
      const { error: upErr } = await admin.storage
        .from('avatars').upload(path, photo, { upsert: true, contentType: photo.type });
      if (!upErr) {
        const { data: pub } = admin.storage.from('avatars').getPublicUrl(path);
        await admin.from('profiles')
          .update({ photo_url: pub.publicUrl + '?v=' + Date.now() }).eq('id', userId);
      }
    }
  }

  // consent record — one row per document, with the version the user actually saw
  if (data.user) {
    const ua = headers().get('user-agent');
    const ip = headers().get('x-forwarded-for')?.split(',')[0] ?? null;
    await supabase.from('consents').insert([
      { profile_id: data.user.id, doc: 'privacy', version: CURRENT_PRIVACY_VERSION, user_agent: ua, ip },
      { profile_id: data.user.id, doc: 'terms', version: CURRENT_TERMS_VERSION, user_agent: ua, ip },
      { profile_id: data.user.id, doc: 'disclaimer', version: DISCLAIMER_VERSION, user_agent: ua, ip },
    ]);
  }

  // Confirm-email on: no session yet, so tell the user instead of bouncing them
  if (!data.session) {
    return { ok: true, checkEmail: d.email };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/dashboard');

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'That email and password do not match an account.' };

  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

/** Resend the signup confirmation email. */
export async function resendConfirmation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Enter your email address.' };

  const supabase = createClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: siteUrl() + '/auth/callback' },
  });
  if (error) return { error: error.message };
  return { ok: true, checkEmail: email };
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '');
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: siteUrl() + '/auth/reset',
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes('rate limit') || m.includes('too many')) {
      return {
        error: 'Too many reset emails just now. Wait a few minutes and try again — '
          + 'and check your spam folder, the earlier one may have arrived.',
      };
    }
    return { error: error.message };
  }
  return { ok: true };
}
