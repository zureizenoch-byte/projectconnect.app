import { getSession } from '@/lib/auth';
import { PLANS, planValue } from '@/lib/tiers';
import { CheckoutButton } from './CheckoutButton';

export const metadata = { title: 'Pricing — Project Connect' };

const ORDER = ['free', 'monthly', 'six_month', 'annual', 'twelve_month'] as const;

const FEATURES: Record<string, string[]> = {
  free: ['One event per cycle', 'Chapter feed', 'Profile and experience mapping'],
  monthly: ['Unlimited events', 'Speaker Series talks', 'Cancel any time'],
  six_month: ['Unlimited events for six months', 'Speaker Series talks', 'One-time payment'],
  annual: ['Unlimited events for a year', 'Speaker Series talks', 'Renews yearly'],
  twelve_month: ['Unlimited events for twelve months', 'Speaker Series talks', 'One-time payment'],
};

export default async function PricingPage() {
  const session = await getSession();
  const current = session?.subscription.tier ?? null;

  return (
    <main className="wrap">
      <h1>Pricing</h1>
      <p className="mute" style={{ marginTop: 10, maxWidth: '60ch' }}>
        Free covers one event per cycle. Paid plans open every meetup and every Speaker Series talk
        in your chapter. Longer plans cost less per month — each card shows what it saves against
        paying monthly.
      </p>

      <div className="grid" style={{ marginTop: 30, gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))' }}>
        {ORDER.map((tier) => {
          const plan = PLANS[tier];
          const popular = tier === 'annual';
          const value = planValue(tier);
          return (
            <div key={tier} className="surf"
              style={{
                padding: 24,
                borderColor: popular ? 'var(--gold)' : 'var(--line)',
                boxShadow: popular ? '0 14px 34px -14px rgba(51,82,207,.5)' : 'var(--sh)',
              }}>
              {value && value.saving > 0 && (
                <span className="pill" style={{
                  position: 'absolute', top: 14, right: 14,
                  background: '#e8f6ed', border: '1px solid #bde5cb', color: 'var(--ok)',
                }}>Save {value.saving}%</span>
              )}
              {popular && (
                <span className="pill" style={{
                  display: 'inline-flex', marginBottom: 12,
                  background: 'linear-gradient(100deg, var(--gold), var(--grn))',
                  color: '#fff', border: 0,
                }}>Most popular</span>
              )}
              <p className="eyebrow">{plan.label}</p>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 38, margin: '10px 0 0' }}>{plan.price}</p>
              <p className="mute small" style={{ margin: 0 }}>{plan.cadence}</p>
              {value && value.saving > 0 && (
                <p className="small" style={{ margin: '8px 0 0', color: 'var(--gold-700)' }}>
                  {value.perMonth} a month · {value.savedTotal} less than paying monthly
                </p>
              )}
              {tier === 'monthly' && (
                <p className="small mute" style={{ margin: '8px 0 0' }}>
                  The baseline every other plan is measured against
                </p>
              )}
              <ul className="mute small" style={{ paddingLeft: 18, marginTop: 14, lineHeight: 1.8 }}>
                {FEATURES[tier].map((f) => <li key={f}>{f}</li>)}
              </ul>
              <div style={{ marginTop: 18 }}>
                {current === tier ? (
                  <span className="pill pill-ok">Current plan</span>
                ) : tier === 'free' ? (
                  <a className="btn btn-out" href="/signup" style={{ width: '100%' }}>Start free</a>
                ) : session ? (
                  <CheckoutButton tier={tier} popular={popular} />
                ) : (
                  <a className="btn btn-out" href="/signup" style={{ width: '100%' }}>Join to subscribe</a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="hint" style={{ marginTop: 22 }}>
        Prices in Canadian dollars. Passes are one-time payments; monthly and annual plans renew until cancelled.
      </p>
    </main>
  );
}
