import type { Tier } from '@/lib/types';

/** Recurring plans — the ones that keep renewing, as opposed to a fixed pass. */
const RECURRING: Tier[] = ['monthly', 'annual'];

export function isRecurring(tier?: string | null, status?: string | null) {
  if (!tier || !RECURRING.includes(tier as Tier)) return false;
  return !status || ['active', 'trialing', 'paid'].includes(status);
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
  if (isRecurring(tier, status)) {
    return (
      <span className="pill" style={{
        ...style,
        background: 'linear-gradient(100deg,var(--gold),var(--grn))',
        border: '1px solid transparent',
        color: '#fff',
      }}>Premium</span>
    );
  }
  return null;
}
