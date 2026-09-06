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

/** How many months each plan covers, for comparing like with like. */
export const PLAN_MONTHS: Record<string, number> = {
  monthly: 1, six_month: 6, annual: 12, twelve_month: 12,
};

const AMOUNT: Record<string, number> = {
  free: 0, monthly: 7.99, six_month: 35, annual: 49, twelve_month: 49,
};

/**
 * What a plan works out to per month, and what that saves against paying
 * monthly — the only honest way to compare a pass with a subscription.
 */
export function planValue(tier: string) {
  const months = PLAN_MONTHS[tier];
  const amount = AMOUNT[tier];
  if (!months || !amount) return null;

  const perMonth = amount / months;
  const baseline = AMOUNT.monthly;
  const saving = Math.round((1 - perMonth / baseline) * 100);

  return {
    perMonth: '$' + perMonth.toFixed(2),
    saving: saving > 0 ? saving : 0,
    savedTotal: '$' + (baseline * months - amount).toFixed(2),
  };
}
