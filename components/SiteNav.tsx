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
        <a href={profile ? '/dashboard' : '/'} style={{ fontFamily: 'var(--font-heading)', fontSize: 20 }}>
          Project&nbsp;Connect
        </a>
        <div className="row" style={{ gap: 18, marginLeft: 8 }}>
          {links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
        </div>
        <div className="row" style={{ marginLeft: 'auto', gap: 10 }}>
          {profile ? (
            <>
              <a href="/profile" className="small mute">{profile.full_name ?? profile.email}</a>
              <form action={signOut}>
                <button className="btn btn-out" type="submit">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <a className="btn btn-out" href="/login">Log in</a>
              <a className="btn btn-primary" href="/signup">Join</a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
