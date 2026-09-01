'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Keeps seat counts honest. Listens for seat changes over Supabase realtime,
 * and also re-checks on an interval and whenever the tab regains focus — so
 * the count is right even where realtime replication is not switched on.
 */
export function LiveSeats({ eventId, intervalMs = 25000 }:
  { eventId?: string; intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const refresh = () => router.refresh();

    const channel = supabase
      .channel('seats' + (eventId ?? '-all'))
      .on(
        'postgres_changes',
        eventId
          ? { event: '*', schema: 'public', table: 'event_seats', filter: 'event_id=eq.' + eventId }
          : { event: '*', schema: 'public', table: 'event_seats' },
        refresh,
      )
      .subscribe();

    const timer = setInterval(refresh, intervalMs);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [eventId, intervalMs, router]);

  return null;
}
