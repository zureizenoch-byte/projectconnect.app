'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { unblockMember } from '@/app/actions/messages';

export function UnblockButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button className="btn btn-out" disabled={pending}
      style={{ minHeight: 38, padding: '0 16px', fontSize: 14 }}
      onClick={() => start(async () => { await unblockMember(id); router.refresh(); })}>
      {pending ? 'Unblocking…' : 'Unblock'}
    </button>
  );
}
