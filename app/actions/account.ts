'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireSession } from '@/lib/auth';

export type AccountState = { error?: string; ok?: string };

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/;

export async function changePassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const { profile } = await requireSession();
  const current = String(formData.get('current_password') ?? '');
  const next = String(formData.get('new_password') ?? '');
  const confirm = String(formData.get('confirm_password') ?? '');

  if (next !== confirm) return { error: 'The new passwords do not match.' };
  if (!PASSWORD_RULE.test(next)) {
    return { error: 'Password must be 8 to 20 characters, letters and numbers only, with at least one of each.' };
  }
  if (next === current) return { error: 'Choose a password you have not used here before.' };

  const supabase = createClient();

  // re-authenticate: proves the person at the keyboard knows the current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email, password: current,
  });
  if (signInError) return { error: 'Your current password is not correct.' };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: error.message };

  return { ok: 'Password changed. It applies the next time you sign in.' };
}

export async function deleteAccount(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const { user, profile } = await requireSession();
  const password = String(formData.get('password') ?? '');
  const typed = String(formData.get('confirm_text') ?? '').trim();

  if (typed !== 'DELETE') return { error: 'Type DELETE to confirm.' };

  const supabase = createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email, password,
  });
  if (signInError) return { error: 'Your password is not correct.' };

  const admin = createAdminClient();

  // Keep the audit trail, drop the person: posts and comments are anonymised
  // rather than deleted, so other members' threads stay readable.
  await admin.from('audit_log').insert({
    actor_id: null, action: 'account.delete', target: user.id,
    meta: { email: profile.email, deleted_at: new Date().toISOString() },
  });

  await admin.from('event_seats').update({ status: 'cancelled' }).eq('profile_id', user.id);

  // cascades handle profile_tags, privacy_settings, subscriptions,
  // consents, access_requests, role_grants, posts and comments
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/?deleted=1');
}
