import { navFor } from '@/lib/permissions';
import { signOut } from '@/app/actions/auth';
import type { Profile } from '@/lib/types';

export function SiteNav({ profile }: { profile: Profile | null }) {
  const links: [string, string][] = profile
    ? navFor(profile)
    : [['Events', '/events'], ['Venues', '/venues'], ['Pricing', '/pricing']];

  return (
    <nav className="nav">
      <div className="nav-in">
        <a className="brand" href={profile ? '/dashboard' : '/'}>
          <img src="/pc-mark-2026.png" alt="" />
          <span>Project<span style={{ color: 'var(--gold-700)' }}>Connect</span></span>
        </a>
        <div className="navpill" style={{ marginLeft: 'auto' }}>
          {links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
        </div>
        <div className="row" style={{ gap: 8 }}>
          {profile ? (
            <>
              <a className="btn btn-quiet" style={{ minHeight: 38, padding: '0 14px', fontSize: 14 }} href="/profile">
                Profile
              </a>
              <form action={signOut}>
                <button className="btn btn-out" type="submit"
                  style={{ minHeight: 38, padding: '0 16px', fontSize: 14 }}>Sign out</button>
              </form>
            </>
          ) : (
            <>
              <a className="btn btn-quiet" style={{ minHeight: 38, padding: '0 14px', fontSize: 14 }} href="/login">Log in</a>
              <a className="btn btn-dark" style={{ minHeight: 38, padding: '0 18px', fontSize: 14 }} href="/signup">Join</a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
