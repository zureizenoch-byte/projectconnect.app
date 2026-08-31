'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { openConversation } from '@/app/actions/messages';

export function MessageButton({ otherId }: { otherId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button className="btn btn-primary" disabled={pending}
        onClick={() => start(async () => {
          const res = await openConversation(otherId);
          if (res.error) setError(res.error);
          else router.push('/messages/' + res.ok);
        })}>
        {pending ? 'Opening…' : 'Message'}
      </button>
      {error && <p className="err" style={{ width: '100%' }}>{error}</p>}
    </>
  );
}
