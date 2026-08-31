/**
 * The one avatar in the app. Never renders an empty circle: with a photo it
 * shows the photo, without one it shows initials on a tinted disc, so a missing
 * image is always distinguishable from a broken one.
 */
export function Avatar({
  src, name, email, size = 48, ring = false,
}: {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const label = (name || email || '').trim();
  const initials = label
    ? label.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
    : '?';

  const base: React.CSSProperties = {
    width: size,
    height: size,
    flex: 'none',
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
    background: 'var(--gold-100)',
    border: ring ? '2px solid #fff' : '1px solid var(--line)',
    boxShadow: ring ? 'var(--sh)' : undefined,
    color: 'var(--gold-700)',
    fontFamily: 'var(--font-heading)',
    fontWeight: 600,
    fontSize: Math.max(11, Math.round(size * 0.38)),
    letterSpacing: '.02em',
    userSelect: 'none',
  };

  if (src) {
    return (
      <span style={base} aria-hidden={false} role="img" aria-label={label || 'Member'}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" width={size} height={size}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </span>
    );
  }

  return <span style={base} role="img" aria-label={label || 'Member'}>{initials}</span>;
}
