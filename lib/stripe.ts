import Stripe from 'stripe';

export const stripeEnabled = !!process.env.STRIPE_SECRET_KEY;

export const stripe = stripeEnabled
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
  : null;

/** Passes are one-time payments; monthly and annual are recurring. */
export const PRICE_MODE: Record<string, 'subscription' | 'payment'> = {
  monthly: 'subscription',
  annual: 'subscription',
  six_month: 'payment',
  twelve_month: 'payment',
};

export function priceIdFor(tier: string) {
  const map: Record<string, string | undefined> = {
    monthly: process.env.STRIPE_PRICE_MONTHLY,
    six_month: process.env.STRIPE_PRICE_SIX_MONTH,
    annual: process.env.STRIPE_PRICE_ANNUAL,
    twelve_month: process.env.STRIPE_PRICE_TWELVE_MONTH,
  };
  return map[tier];
}
