import type { Tier } from '@/lib/types';

/** Recurring plans — the ones that keep renewing, as opposed to a fixed pass. */
const RECURRING: Tier[] = ['monthly', 'annual'];
const PASSES: Tier[] = ['six_month', 'twelve_month'];

function live(status?: string | null) {
  return !status || ['active', 'trialing', 'paid'].includes(status);
}

export function isRecurring(tier?: string | null, status?: string | null) {
  return !!tier && RECURRING.includes(tier as Tier) && live(status);
}

export function isPass(tier?: string | null, status?: string | null) {
  return !!tier && PASSES.includes(tier as Tier) && live(status);
}

/** Premium for a subscription, Pro for a pass — both paid, both worth marking. */
export function planBadge(tier?: string | null, status?: string | null) {
  if (isRecurring(tier, status)) return 'Premium';
  if (isPass(tier, status)) return 'Pro';
  return null;
}

/**
 * The one badge next to a member's name. Role comes first — an admin or
 * speaker is more worth knowing than a plan — and Premium marks members on a
 * recurring plan.
 */
export function MemberBadge({
  role, speakerApproved, tier, status, size = 'md',
}: {
  role?: string | null;
  speakerApproved?: boolean | null;
  tier?: string | null;
  status?: string | null;
  size?: 'sm' | 'md';
}) {
  const small = size === 'sm';
  const style: React.CSSProperties = small
    ? { marginLeft: 6, fontSize: 10 }
    : { marginLeft: 6 };

  if (role === 'admin') {
    return <span className="pill pill-ok" style={style}>Admin</span>;
  }
  if (role === 'speaker' && speakerApproved) {
    return <span className="pill pill-wait" style={style}>Speaker</span>;
  }
  if (role === 'chapter_lead') {
    return <span className="pill pill-wait" style={style}>Chapter Lead</span>;
  }
  const plan = planBadge(tier, status);
  if (plan === 'Premium') {
    return (
      <span className="pill" style={{
        ...style,
        background: 'linear-gradient(100deg,var(--gold),var(--grn))',
        border: '1px solid transparent',
        color: '#fff',
      }}>Premium</span>
    );
  }
  if (plan === 'Pro') {
    return (
      <span className="pill" style={{
        ...style,
        background: 'var(--gold-100)',
        border: '1px solid var(--gold)',
        color: 'var(--gold-700)',
      }}>Pro</span>
    );
  }
  return null;
}
