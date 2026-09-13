import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Member name search for the header field.
 *
 * Reads with the service-role client, because the RLS policy on profiles only
 * exposes rows a member can already see — but honours each person's visibility
 * setting explicitly, so opting out still hides you from search.
 */
export async function GET(request: Request) {
  const { profile } = await requireSession();

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ members: [] });

  const db = createAdminClient();

  const { data: rows } = await db
    .from('profiles')
    .select('id,full_name,photo_url,role_level,city')
    .ilike('full_name', '%' + q + '%')
    .order('full_name')
    .limit(30);

  const ids = (rows ?? []).map((r: any) => r.id);
  const { data: privacy } = ids.length
    ? await db.from('privacy_settings').select('profile_id,visible_to_members').in('profile_id', ids)
    : { data: [] as any[] };

  const hidden = new Set(
    (privacy ?? [])
      .filter((p: any) => p.visible_to_members === false)
      .map((p: any) => p.profile_id),
  );

  const isAdmin = profile.role === 'admin';
  const members = (rows ?? [])
    .filter((r: any) => isAdmin || r.id === profile.id || !hidden.has(r.id))
    .slice(0, 12);

  return NextResponse.json({ members });
}
