'use client';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      <h1>Admin could not load</h1>
      <div className="surf" style={{ padding: 22, marginTop: 20, borderColor: 'var(--err)' }}>
        <strong style={{ color: 'var(--err)' }}>{error.message}</strong>
        {error.digest && (
          <p className="mute small" style={{ marginTop: 8 }}>Reference: {error.digest}</p>
        )}
        {error.stack && (
          <pre style={{
            marginTop: 14, padding: 14, borderRadius: 10, overflowX: 'auto',
            background: '#f6f7fb', fontSize: 12.5, lineHeight: 1.5,
          }}>{error.stack.split('\n').slice(0, 12).join('\n')}</pre>
        )}
      </div>
      <div className="row" style={{ gap: 10, marginTop: 18 }}>
        <button className="btn btn-primary" onClick={reset}>Try again</button>
        <a className="btn btn-out" href="/dashboard">Back to dashboard</a>
      </div>
    </main>
  );
}
