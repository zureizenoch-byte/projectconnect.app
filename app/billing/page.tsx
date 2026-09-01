import { requireSession } from '@/lib/auth';
import { PLANS, isPaid } from '@/lib/tiers';
import { stripeEnabled } from '@/lib/stripe';

export const metadata = { title: 'Billing — Project Connect' };

export default async function BillingPage({ searchParams }: { searchParams: { status?: string } }) {
  const { profile, subscription } = await requireSession();
  const runsProgramme = profile.role === 'admin' || profile.role === 'chapter_lead';
  const plan = PLANS[subscription.tier];
  const paid = isPaid(subscription.tier, subscription.status, subscription.current_period_end);

  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      <h1>Billing</h1>
      {searchParams.status === 'success' && (
        <div className="surf" style={{ padding: 18, marginTop: 20, background: '#e8f6ed', borderColor: '#bde5cb' }}>
          <strong>Payment received.</strong> <span className="mute">Your plan is active.</span>
        </div>
      )}
      {runsProgramme && (
        <div className="surf" style={{
          padding: 18, marginTop: 20,
          background: 'var(--gold-100)', borderColor: 'var(--gold-200)',
        }}>
          <strong style={{ color: 'var(--gold-700)' }}>
            {profile.role === 'admin' ? 'Admin access' : 'Chapter Lead access'}
          </strong>
          <p className="mute small" style={{ margin: '6px 0 0' }}>
            You have every paid capability while you hold this role — unlimited events and
            Speaker Series talks — with nothing to pay.
          </p>
        </div>
      )}

      <div className="surf" style={{ padding: 26, marginTop: 22 }}>
        <p className="eyebrow">Current plan</p>
        <h2 style={{ marginTop: 10 }}>{plan.label} · {plan.price} {plan.cadence}</h2>
        <p className="mute" style={{ marginTop: 8 }}>
          Status: {subscription.status}
          {subscription.current_period_end &&
            ' · runs until ' + new Date(subscription.current_period_end).toLocaleDateString('en-CA', { dateStyle: 'long' })}
        </p>
        <p className="mute small" style={{ marginTop: 12 }}>
          {paid ? 'Unlimited events and Speaker Series talks.' : 'Free covers one event per cycle; talks need a paid plan.'}
        </p>
        <div className="row" style={{ marginTop: 18 }}>
          <a className="btn btn-primary" href="/pricing">{paid ? 'Change plan' : 'Upgrade'}</a>
        </div>
        {!stripeEnabled && (
          <p className="hint">Stripe keys are not set, so checkout is stubbed. Add them to <code>.env</code> to take payments.</p>
        )}
      </div>
    </main>
  );
}
