import type { Tier } from './types';

export const PAID_TIERS: Tier[] = ['monthly', 'six_month', 'annual', 'twelve_month'];

export const PLANS: Record<Tier, { label: string; price: string; cadence: string; envKey?: string }> = {
  free:         { label: 'Free',           price: '$0',  cadence: 'forever' },
  monthly:      { label: 'Monthly',        price: '$7.99', cadence: 'per month',  envKey: 'STRIPE_PRICE_MONTHLY' },
  six_month:    { label: '6-Month Pass',   price: '$35', cadence: 'one-time',     envKey: 'STRIPE_PRICE_SIX_MONTH' },
  annual:       { label: 'Annual',         price: '$49', cadence: 'per year',     envKey: 'STRIPE_PRICE_ANNUAL' },
  twelve_month: { label: '12-Month Pass',  price: '$49', cadence: 'one-time',     envKey: 'STRIPE_PRICE_TWELVE_MONTH' },
};

export function isPaid(tier: Tier, status?: string, periodEnd?: string | null) {
  if (!PAID_TIERS.includes(tier)) return false;
  if (status && !['active', 'trialing', 'paid'].includes(status)) return false;
  if (periodEnd && new Date(periodEnd).getTime() < Date.now()) return false;
  return true;
}

/** Free tier: one meetup per cycle, no Speaker talks. Cycles are calendar months. */
export function cycleBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}
