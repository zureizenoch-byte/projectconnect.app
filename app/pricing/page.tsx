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
        in your chapter. Longer plans cost less per month — each card shows the discount against
        paying monthly.
      </p>

      <div className="grid" style={{ marginTop: 30, gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))' }}>
        {ORDER.map((tier) => {
          const plan = PLANS[tier];
          const popular = tier === 'annual';
          const value = planValue(tier);
          const badge = tier === 'monthly' || tier === 'annual' ? 'Premium'
            : tier === 'six_month' || tier === 'twelve_month' ? 'Pro'
              : null;
          return (
            <div key={tier} className="surf"
              style={{
                padding: 24,
                borderColor: popular ? 'var(--gold)' : 'var(--line)',
                boxShadow: popular ? '0 14px 34px -14px rgba(51,82,207,.5)' : 'var(--sh)',
              }}>
              {popular && (
                <span className="pill" style={{
                  display: 'inline-flex', marginBottom: 12,
                  background: 'linear-gradient(100deg, var(--gold), var(--grn))',
                  color: '#fff', border: 0,
                }}>Most popular</span>
              )}
              <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
                <p className="eyebrow" style={{ margin: 0 }}>{plan.label}</p>
                {badge && (
                  <span className="pill" style={badge === 'Premium'
                    ? {
                        background: 'linear-gradient(100deg,var(--gold),var(--grn))',
                        border: '1px solid transparent', color: '#fff',
                      }
                    : {
                        background: 'var(--gold-100)',
                        border: '1px solid var(--gold)', color: 'var(--gold-700)',
                      }}>{badge}</span>
                )}
              </div>
              <div className="row" style={{ gap: 10, alignItems: 'baseline', marginTop: 10 }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 38, lineHeight: 1 }}>
                  {plan.price}
                </span>
                {value && value.saving > 0 && (
                  <span className="pill" style={{
                    background: '#e8f6ed', border: '1px solid #bde5cb', color: 'var(--ok)',
                  }}>Save {value.saving}%</span>
                )}
              </div>
              <p className="mute small" style={{ margin: '6px 0 0' }}>{plan.cadence}</p>
              {value && value.saving > 0 && (
                <p className="small" style={{ margin: '6px 0 0', color: 'var(--gold-700)' }}>
                  {value.perMonth} a month
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

      <div className="surf" style={{
        padding: 18, marginTop: 26, display: 'flex', gap: 20,
        alignItems: 'center', flexWrap: 'wrap',
      }}>
        <span className="row" style={{ gap: 8 }}>
          <span className="pill" style={{
            background: 'linear-gradient(100deg,var(--gold),var(--grn))',
            border: '1px solid transparent', color: '#fff',
          }}>Premium</span>
          <span className="mute small">Monthly and Annual members</span>
        </span>
        <span className="row" style={{ gap: 8 }}>
          <span className="pill" style={{
            background: 'var(--gold-100)', border: '1px solid var(--gold)', color: 'var(--gold-700)',
          }}>Pro</span>
          <span className="mute small">6- and 12-Month Pass holders</span>
        </span>
        <span className="mute small" style={{ marginLeft: 'auto' }}>
          Your badge appears next to your name on posts, events and your profile.
        </span>
      </div>

      <p className="hint" style={{ marginTop: 22 }}>
        Prices in Canadian dollars. Passes are one-time payments; monthly and annual plans renew until cancelled.
      </p>
    </main>
  );
}
