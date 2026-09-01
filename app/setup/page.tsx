import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { ClaimAdmin } from './ClaimAdmin';
import { bootstrapEmails } from '@/app/actions/admin';

export const metadata = { title: 'Setup — Project Connect' };
export const dynamic = 'force-dynamic';

/**
 * Bootstrap route. Visible only while the platform has no admin at all —
 * once one exists this page sends you away, so it cannot be used to escalate.
 */
export default async function SetupPage() {
  const { profile } = await requireSession();
  const admin = createAdminClient();

  const { count } = await admin
    .from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin');

  if ((count ?? 0) > 0) redirect('/dashboard');

  // Not on the allowlist? The page does not exist for you.
  const allowed = bootstrapEmails();
  if (allowed.length === 0 || !allowed.includes(profile.email.toLowerCase())) {
    redirect('/dashboard');
  }

  return (
    <main className="wrap" style={{ maxWidth: 620 }}>
      <p className="eyebrow">First-run setup</p>
      <h1 style={{ marginTop: 12 }}>Claim admin access</h1>
      <p className="mute" style={{ marginTop: 12 }}>
        Project Connect has no admin account yet. Claim it for{' '}
        <strong>{profile.email}</strong> and you'll be able to grant every other role
        from the admin console — no database work needed.
      </p>
      <div className="surf" style={{ padding: 26, marginTop: 24 }}>
        <ClaimAdmin />
      </div>
      <p className="hint">This page disappears as soon as an admin exists.</p>
    </main>
  );
}
