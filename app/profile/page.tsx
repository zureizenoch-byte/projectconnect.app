import { requireSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { isPaid } from '@/lib/tiers';
import { ProfileForm } from './ProfileForm';
import { PrivacyForm } from './PrivacyForm';
import { AccessRequestForm } from './AccessRequestForm';
import { AccountSecurity } from './AccountSecurity';

export const metadata = { title: 'Profile — Project Connect' };

export default async function ProfilePage({ searchParams }: { searchParams: { welcome?: string } }) {
  const { user, profile, subscription } = await requireSession();
  const supabase = createClient();

  const [{ data: tags }, { data: privacy }, { data: requests }] = await Promise.all([
    supabase.from('profile_tags').select('category,value,is_custom').eq('profile_id', user.id),
    supabase.from('privacy_settings').select('*').eq('profile_id', user.id).maybeSingle(),
    supabase.from('access_requests').select('id,kind,status,note,created_at,decided_at').eq('profile_id', user.id),
  ]);

  const paid = isPaid(subscription.tier, subscription.status, subscription.current_period_end);

  return (
    <main className="wrap" style={{ maxWidth: 940 }}>
      {searchParams.welcome && (
        <div className="surf" style={{ padding: 18, marginBottom: 24, background: 'var(--gold-100)', borderColor: 'var(--gold-200)' }}>
          <strong>Account created.</strong>{' '}
          <span className="mute">Complete your profile now — matching uses these fields.</span>
        </div>
      )}
      <h1>Your profile</h1>
      <p className="mute" style={{ marginTop: 10, maxWidth: '62ch' }}>
        Map your experience once. These fields drive who you get matched with at a table.
      </p>

      <ProfileForm profile={profile} tags={tags ?? []} />
      <PrivacyForm settings={privacy ?? null} />
      <AccessRequestForm profile={profile} paid={paid} requests={requests ?? []} />
      <AccountSecurity email={profile.email} />
    </main>
  );
}
