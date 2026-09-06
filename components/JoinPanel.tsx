import { joinDetails } from '@/lib/meeting';

/**
 * How to get into an online event. The link is shown only to people holding a
 * live seat, and to whoever is running it — otherwise the panel explains what
 * taking a seat gets you, rather than leaking the room.
 */
export function JoinPanel({
  format, meetingUrl, meetingNote, canSee, startsAt,
}: {
  format?: string | null;
  meetingUrl?: string | null;
  meetingNote?: string | null;
  canSee: boolean;
  startsAt: string;
}) {
  const details = joinDetails(format, meetingUrl, meetingNote);
  if (!details) return null;

  const minsAway = Math.round((+new Date(startsAt) - Date.now()) / 60000);
  const openSoon = minsAway <= 15 && minsAway > -120;

  return (
    <div style={{
      marginTop: 18, padding: '18px 20px', borderRadius: 14,
      border: '1px solid ' + (openSoon ? 'var(--gold)' : 'var(--gold-200)'),
      background: 'var(--gold-100)',
    }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
        <span className="eyebrow" style={{ margin: 0 }}>{details.label}</span>
        {openSoon && (
          <span className="pill" style={{
            background: '#e8f6ed', border: '1px solid #bde5cb', color: 'var(--ok)',
          }}>{minsAway > 0 ? 'Starts in ' + minsAway + ' min' : 'Happening now'}</span>
        )}
      </div>

      {canSee && details.url ? (
        <>
          <a className="btn btn-gold" href={details.url} target="_blank" rel="noopener noreferrer"
            style={{ marginTop: 14, minHeight: 46, padding: '0 22px', fontSize: 15.5 }}>
            Join the {details.label} room
          </a>

          {(details.meetingId || details.passcode) && (
            <dl className="row" style={{ gap: 24, margin: '16px 0 0' }}>
              {details.meetingId && (
                <div>
                  <dt className="mute small">Meeting ID</dt>
                  <dd style={{ margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                    {details.meetingId}
                  </dd>
                </div>
              )}
              {details.passcode && (
                <div>
                  <dt className="mute small">Passcode</dt>
                  <dd style={{ margin: '2px 0 0', letterSpacing: '.04em' }}>{details.passcode}</dd>
                </div>
              )}
            </dl>
          )}

          {details.note && (
            <p className="small" style={{ margin: '12px 0 0', color: 'var(--gold-700)' }}>
              {details.note}
            </p>
          )}
        </>
      ) : (
        <p className="mute small" style={{ margin: '8px 0 0' }}>
          Take a seat and the joining link appears here. It stays with the event, so you can
          come back to it rather than hunting through email.
        </p>
      )}
    </div>
  );
}
