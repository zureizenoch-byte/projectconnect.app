import { createClient } from '@/lib/supabase/server';
import { mapsUrl } from '@/lib/matching';

export const metadata = { title: 'Venues — Project Connect' };

export default async function VenuesPage() {
  const supabase = createClient();
  const { data: venues } = await supabase
    .from('venues').select('id,name,address,capacity,notes,chapters(city)')
    .eq('active', true).order('name');

  return (
    <main className="wrap">
      <h1>Venues</h1>
      <p className="mute" style={{ marginTop: 10, maxWidth: '60ch' }}>
        Rooms our chapters use. Capacity is the hard seat cap for any event held there.
      </p>
      <div className="grid g2" style={{ marginTop: 26 }}>
        {(venues ?? []).map((v: any) => (
          <div key={v.id} className="surf" style={{ padding: 22 }}>
            <p className="eyebrow">{v.chapters?.city}</p>
            <h3 style={{ marginTop: 8 }}>{v.name}</h3>
            <p className="mute small" style={{ marginTop: 6 }}>{v.address}</p>
            <p className="mute small">Up to {v.capacity} seats{v.notes ? ' · ' + v.notes : ''}</p>
            <a className="btn btn-out" style={{ marginTop: 14 }} target="_blank"
              rel="noopener noreferrer" href={mapsUrl(v.address)}>Directions</a>
          </div>
        ))}
        {!venues?.length && <p className="mute">No venues listed yet.</p>}
      </div>
    </main>
  );
}
