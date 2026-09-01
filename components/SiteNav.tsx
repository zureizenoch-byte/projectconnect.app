import { navFor } from '@/lib/permissions';
import { signOut } from '@/app/actions/auth';
import type { Profile } from '@/lib/types';
import { Avatar } from '@/components/Avatar';

export function SiteNav({ profile, inboxCount = 0, unreadCount = 0, alertCount = 0 }:
  { profile: Profile | null; inboxCount?: number; unreadCount?: number; alertCount?: number }) {
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
              <a href="/notifications" aria-label={alertCount + ' notifications'}
                title="Notifications"
                style={{
                  position: 'relative', display: 'grid', placeItems: 'center',
                  width: 38, height: 38, borderRadius: 11,
                  border: '1px solid var(--line)', background: '#fff',
                  color: 'var(--ink)', textDecoration: 'none',
                }}>
                <svg aria-hidden width="19" height="19" viewBox="0 0 24 24" fill="#fff"
                  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {alertCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -6, right: -6,
                    display: 'grid', placeItems: 'center',
                    minWidth: 19, height: 19, padding: '0 5px', borderRadius: 999,
                    background: 'var(--err)', color: '#fff',
                    fontSize: 11.5, fontWeight: 700, lineHeight: 1,
                  }}>{alertCount > 99 ? '99+' : alertCount}</span>
                )}
              </a>
              <a href={'/members/' + profile.id} title={profile.full_name ?? 'Your profile'}
                aria-label="Your profile"
                style={{ display: 'inline-flex', textDecoration: 'none', lineHeight: 0 }}>
                <Avatar src={profile.photo_url} name={profile.full_name} email={profile.email} size={38} />
              </a>
              <a className="btn btn-quiet" style={{ minHeight: 38, padding: '0 14px', fontSize: 14 }} href="/profile">
                Edit profile
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
