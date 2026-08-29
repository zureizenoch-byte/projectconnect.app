import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { stripe, stripeEnabled, priceIdFor, PRICE_MODE } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const { user, profile, subscription } = await requireSession();
  const { tier } = await request.json();

  if (!stripeEnabled || !stripe) {
    return NextResponse.json({ error: 'Billing is not configured yet. Add your Stripe keys to .env.' }, { status: 400 });
  }
  const price = priceIdFor(tier);
  if (!price) return NextResponse.json({ error: 'No Stripe price for that plan.' }, { status: 400 });

  let customerId = subscription.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      name: profile.full_name ?? undefined,
      metadata: { profile_id: user.id },
    });
    customerId = customer.id;
    const admin = createAdminClient();
    await admin.from('subscriptions').upsert({ profile_id: user.id, stripe_customer_id: customerId });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const session = await stripe.checkout.sessions.create({
    mode: PRICE_MODE[tier] ?? 'subscription',
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: site + '/billing?status=success',
    cancel_url: site + '/pricing?status=cancelled',
    client_reference_id: user.id,
    metadata: { profile_id: user.id, tier },
  });

  return NextResponse.json({ url: session.url });
}
