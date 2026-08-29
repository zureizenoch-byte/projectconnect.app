'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from '@/lib/legal';

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10, 'Use at least 10 characters'),
  confirm: z.string(),
  full_name: z.string().min(2),
  pronouns: z.string().optional(),
  role: z.enum(['member', 'student', 'speaker']),
  city: z.string().min(2),
  is_immigrant: z.coerce.boolean().optional(),
  agree: z.literal('on', { errorMap: () => ({ message: 'You must agree to the Terms and Privacy Policy' }) }),
}).refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export type ActionState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

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
      emailRedirectTo: (process.env.NEXT_PUBLIC_SITE_URL ?? '') + '/auth/callback',
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

  // consent record — one row per document, with the version the user actually saw
  if (data.user) {
    const ua = headers().get('user-agent');
    const ip = headers().get('x-forwarded-for')?.split(',')[0] ?? null;
    await supabase.from('consents').insert([
      { profile_id: data.user.id, doc: 'privacy', version: CURRENT_PRIVACY_VERSION, user_agent: ua, ip },
      { profile_id: data.user.id, doc: 'terms', version: CURRENT_TERMS_VERSION, user_agent: ua, ip },
    ]);
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

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '');
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: (process.env.NEXT_PUBLIC_SITE_URL ?? '') + '/auth/reset',
  });
  if (error) return { error: error.message };
  return { ok: true };
}
