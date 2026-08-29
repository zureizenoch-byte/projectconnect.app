import { NextResponse } from 'next/server';
import { stripe, stripeEnabled } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  if (!stripeEnabled || !stripe) return NextResponse.json({ received: true });

  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: 'Not configured' }, { status: 400 });

  const body = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid signature: ' + err.message }, { status: 400 });
  }

  const admin = createAdminClient();

  const setTier = async (profileId: string, patch: Record<string, unknown>) => {
    await admin.from('subscriptions').upsert({
      profile_id: profileId, updated_at: new Date().toISOString(), ...patch,
    });
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const s: any = event.data.object;
      const profileId = s.metadata?.profile_id ?? s.client_reference_id;
      if (profileId) {
        const oneTime = s.mode === 'payment';
        const months = s.metadata?.tier === 'six_month' ? 6 : 12;
        await setTier(profileId, {
          tier: s.metadata?.tier ?? 'monthly',
          status: 'active',
          stripe_customer_id: s.customer,
          stripe_subscription_id: s.subscription ?? null,
          current_period_end: oneTime
            ? new Date(Date.now() + months * 30 * 24 * 3600 * 1000).toISOString()
            : null,
        });
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub: any = event.data.object;
      const { data: row } = await admin.from('subscriptions')
        .select('profile_id').eq('stripe_customer_id', sub.customer).maybeSingle();
      if (row) {
        await setTier(row.profile_id, {
          status: sub.status === 'active' || sub.status === 'trialing' ? 'active' : sub.status,
          tier: sub.status === 'canceled' ? 'free' : undefined,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString() : null,
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
