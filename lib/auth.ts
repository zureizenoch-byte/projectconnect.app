import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile, Subscription } from '@/lib/types';

export async function getSession() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single();
  const { data: subscription } = await supabase
    .from('subscriptions').select('*').eq('profile_id', user.id).maybeSingle();

  const role = (profile as Profile | null)?.role;

  // Admins and approved Speakers get every paid capability without billing.
  // Chapter Leads are members who volunteer, so they pay like anyone else.
  // Stated once here, so every isPaid() check and gated button agrees.
  const comped = role === 'admin'
    || (role === 'speaker' && (profile as Profile | null)?.speaker_approved === true);

  const resolved: Subscription = comped
    ? {
        profile_id: user.id,
        tier: 'annual',
        status: 'active',
        stripe_customer_id: (subscription as Subscription | null)?.stripe_customer_id ?? null,
        stripe_subscription_id: (subscription as Subscription | null)?.stripe_subscription_id ?? null,
        current_period_end: null,
      }
    : (subscription as Subscription | null) ?? {
        profile_id: user.id, tier: 'free', status: 'none',
        stripe_customer_id: null, stripe_subscription_id: null, current_period_end: null,
      };

  return {
    user,
    profile: profile as Profile,
    subscription: resolved,
  };
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export async function requireRole(...roles: Profile['role'][]) {
  const session = await requireSession();
  if (!roles.includes(session.profile.role)) redirect('/dashboard');
  return session;
}
