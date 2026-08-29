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

  return {
    user,
    profile: profile as Profile,
    subscription: (subscription as Subscription | null) ?? {
      profile_id: user.id, tier: 'free' as const, status: 'none',
      stripe_customer_id: null, stripe_subscription_id: null, current_period_end: null,
    },
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
