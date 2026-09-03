'use client';

import { useEffect } from 'react';

/** Shows what actually failed instead of a bare digest. */
export default function EventError({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Event page error:', error);
  }, [error]);

  return (
    <main className="wrap" style={{ maxWidth: 640 }}>
      <h1>This event could not load</h1>
      <div className="surf" style={{ padding: 22, marginTop: 20, borderColor: 'var(--err)' }}>
        <p className="eyebrow" style={{ margin: 0 }}>What went wrong</p>
        <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', fontSize: 15 }}>
          {error.message || 'No message was reported.'}
        </p>
        {error.digest && (
          <p className="mute small" style={{ marginTop: 8 }}>Reference: {error.digest}</p>
        )}
      </div>
      <div className="row" style={{ gap: 10, marginTop: 18 }}>
        <button className="btn btn-primary" onClick={reset}>Try again</button>
        <a className="btn btn-out" href="/events">Back to events</a>
      </div>
    </main>
  );
}
