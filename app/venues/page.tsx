import { createClient } from '@/lib/supabase/server';
import { mapsUrl } from '@/lib/matching';
import { VenuePhoto } from '@/components/VenuePhoto';

export const metadata = { title: 'Venues — Project Connect' };
export const dynamic = 'force-dynamic';

export default async function VenuesPage() {
  const supabase = createClient();
  const { data: venues } = await supabase
    .from('venues')
    .select('id,name,address,capacity,notes,photo_url,website,chapters(city)')
    .eq('active', true).order('name');

  return (
    <main className="wrap">
      <h1>Venues</h1>
      <p className="mute" style={{ marginTop: 10, maxWidth: '60ch' }}>
        Rooms our chapters use. Capacity is the hard seat cap for any event held there.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 20, marginTop: 26, alignItems: 'stretch',
      }}>
        {(venues ?? []).map((v: any) => {
          const city = v.chapters?.city ?? '';
          const full = v.address.toLowerCase().includes(city.toLowerCase())
            ? v.address
            : v.address + ', ' + city;

          return (
            <article key={v.id} className="surf lift" style={{
              padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ position: 'relative' }}>
                <VenuePhoto photoUrl={v.photo_url} address={full} name={v.name} />
                <span className="pill" style={{
                  position: 'absolute', top: 12, left: 12,
                  background: 'rgba(255,255,255,.94)', border: '1px solid var(--line)',
                  color: 'var(--gold-700)',
                }}>{city}</span>
              </div>

              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <h3 style={{ fontSize: 21, lineHeight: 1.15 }}>{v.name}</h3>
                <p className="mute small" style={{ margin: 0 }}>{v.address}</p>
                <p className="mute small" style={{ margin: 0 }}>
                  Up to {v.capacity} seats{v.notes ? ' · ' + v.notes : ''}
                </p>

                <div className="row" style={{ gap: 8, marginTop: 'auto', paddingTop: 14 }}>
                  <a className="btn btn-out" target="_blank" rel="noopener noreferrer"
                    href={mapsUrl(full)}
                    style={{ minHeight: 40, padding: '0 16px', fontSize: 14 }}>Directions</a>
                  {v.website && (
                    <a className="btn btn-quiet" target="_blank" rel="noopener noreferrer"
                      href={v.website}
                      style={{ minHeight: 40, padding: '0 12px', fontSize: 14 }}>Website</a>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        {!venues?.length && <p className="mute">No venues listed yet.</p>}
      </div>
    </main>
  );
}
