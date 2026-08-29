'use client';
import { useState, useTransition } from 'react';

export function CheckoutButton({ tier, popular }: { tier: string; popular?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button className={popular ? 'btn btn-gold' : 'btn btn-primary'} style={{ width: '100%' }}
        disabled={pending}
        onClick={() => start(async () => {
          setError(null);
          const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ tier }),
          });
          const data = await res.json();
          if (data.url) window.location.href = data.url;
          else setError(data.error ?? 'Checkout is not configured yet.');
        })}>
        {pending ? 'Opening checkout…' : 'Choose plan'}
      </button>
      {error && <p className="err">{error}</p>}
    </div>
  );
}
