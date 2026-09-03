'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from '@/lib/legal';

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
  role: z.enum(['member', 'student', 'speaker', 'chapter_lead']),
  city: z.string().min(2),
  is_immigrant: z.coerce.boolean().optional(),
  agree: z.literal('on', { errorMap: () => ({ message: 'You must agree to the Terms and Privacy Policy' }) }),
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
        // Speaker and Chapter Lead are granted by an admin, so the account
        // starts as an ordinary member and an application is filed below.
        role: d.role === 'chapter_lead' ? 'member' : d.role,
        city: d.city,
        is_student: d.role === 'student',
        is_immigrant: !!d.is_immigrant,
      },
    },
  });
  if (error) return { error: error.message };

  // Chapter Lead applications go straight to the admin queue
  if (data.user && d.role === 'chapter_lead') {
    const { data: chapter } = await supabase
      .from('chapters').select('id').eq('city', d.city).maybeSingle();
    await supabase.from('access_requests').insert({
      profile_id: data.user.id,
      kind: 'chapter_lead',
      chapter_id: chapter?.id ?? null,
      note: (formData.get('lead_note') ? String(formData.get('lead_note')) : '').slice(0, 2000),
    });
  }

  // consent record — one row per document, with the version the user actually saw
  if (data.user) {
    const ua = headers().get('user-agent');
    const ip = headers().get('x-forwarded-for')?.split(',')[0] ?? null;
    await supabase.from('consents').insert([
      { profile_id: data.user.id, doc: 'privacy', version: CURRENT_PRIVACY_VERSION, user_agent: ua, ip },
      { profile_id: data.user.id, doc: 'terms', version: CURRENT_TERMS_VERSION, user_agent: ua, ip },
    ]);
  }

  // Confirm-email on: no session yet, so tell the user instead of bouncing them
  if (!data.session) {
    return { ok: true, checkEmail: d.email };
  }

  revalidatePath('/', 'layout');
  redirect('/profile?welcome=1');
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
    redirectTo: (process.env.NEXT_PUBLIC_SITE_URL ?? '') + '/auth/reset',
  });
  if (error) return { error: error.message };
  return { ok: true };
}
