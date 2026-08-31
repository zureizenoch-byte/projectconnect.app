import { navFor } from '@/lib/permissions';
import { signOut } from '@/app/actions/auth';
import type { Profile } from '@/lib/types';

export function SiteNav({ profile, inboxCount = 0, unreadCount = 0 }:
  { profile: Profile | null; inboxCount?: number; unreadCount?: number }) {
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
          {links.map(([label, href]) => (
            <a key={href} href={href} style={{ position: 'relative' }}>
              {label}
              {label === 'Messages' && unreadCount > 0 && (
                <span aria-label={unreadCount + ' unread messages'} style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 19, height: 19, marginLeft: 7, padding: '0 5px',
                  borderRadius: 999, background: 'var(--gold-700)', color: '#fff',
                  fontSize: 11.5, fontWeight: 700, lineHeight: 1,
                }}>{unreadCount}</span>
              )}
              {label === 'Admin' && inboxCount > 0 && (
                <span aria-label={inboxCount + ' items need attention'} style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 19, height: 19, marginLeft: 7, padding: '0 5px',
                  borderRadius: 999, background: 'var(--err)', color: '#fff',
                  fontSize: 11.5, fontWeight: 700, lineHeight: 1,
                }}>{inboxCount}</span>
              )}
            </a>
          ))}
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
