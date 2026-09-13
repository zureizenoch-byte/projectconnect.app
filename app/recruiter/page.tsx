import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { CITIES, ROLE_LEVELS } from '@/lib/options';
import { TalentSearch } from './TalentSearch';

export const metadata = { title: 'Recruiter — Project Connect' };
export const dynamic = 'force-dynamic';

export default async function RecruiterPage() {
  // Admins only. Gated here as well as in the nav, so the URL is not a back door.
  await requireRole('admin');

  const db = createAdminClient();

  const [{ data: profiles }, { data: tags }] = await Promise.all([
    db.from('profiles')
      .select('id,full_name,photo_url,role_level,employer,city,intro,years_experience,linkedin_url,role')
      .order('full_name'),
    db.from('profile_tags').select('profile_id,category,value'),
  ]);

  const tagsOf = new Map<string, { category: string; value: string }[]>();
  for (const t of tags ?? []) {
    if (!tagsOf.has(t.profile_id)) tagsOf.set(t.profile_id, []);
    tagsOf.get(t.profile_id)!.push({ category: t.category, value: t.value });
  }

  const people = (profiles ?? []).map((p: any) => ({
    ...p,
    tags: tagsOf.get(p.id) ?? [],
  }));

  const mapped = people.filter((p: any) => p.tags.length > 0).length;

  return (
    <main className="wrap">
      <div style={{
        display: 'flex', gap: 16, alignItems: 'flex-end',
        justifyContent: 'space-between', flexWrap: 'wrap',
      }}>
        <div>
          <p className="eyebrow">Admin only</p>
          <h1 style={{ marginTop: 10 }}>Recruiter</h1>
          <p className="mute" style={{ marginTop: 10, maxWidth: '60ch' }}>
            Search the membership by experience, build a shortlist, and copy it out. Nobody
            except an admin can reach this page.
          </p>
        </div>
      </div>

      <div className="grid g3" style={{ marginTop: 24 }}>
        {[
          ['Members', String(people.length)],
          ['With experience mapped', String(mapped)],
          ['Chapters', String(CITIES.length)],
        ].map(([label, value]) => (
          <div key={label} className="surf" style={{ padding: 20 }}>
            <p className="eyebrow">{label}</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 34, margin: '6px 0 0' }}>{value}</p>
          </div>
        ))}
      </div>

      <TalentSearch people={people} cities={CITIES} levels={ROLE_LEVELS} />
    </main>
  );
}
