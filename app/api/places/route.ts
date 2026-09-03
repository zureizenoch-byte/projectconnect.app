import { NextResponse } from 'next/server';

/**
 * Place lookup, proxied through the server.
 *
 * Doing this here rather than from the browser means no CORS, no ad-blocker
 * interference, and one place to swap the provider. Photon (OpenStreetMap)
 * needs no key; if a Google key is present we use Places Text Search, which
 * knows cafés by name far better.
 */
export const dynamic = 'force-dynamic';

type Hit = { key: string; name: string; address: string; placeId?: string };

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 3) return NextResponse.json({ results: [], source: null });

  const key = process.env.GOOGLE_MAPS_SERVER_KEY
    ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (key) {
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
        },
        body: JSON.stringify({ textQuery: q, maxResultCount: 6 }),
        cache: 'no-store',
      });
      const json = await res.json();
      const results: Hit[] = (json.places ?? []).map((p: any, i: number) => ({
        key: 'g' + i + p.id,
        name: p.displayName?.text ?? q,
        address: p.formattedAddress ?? '',
        placeId: p.id,
      }));
      if (results.length) return NextResponse.json({ results, source: 'Google Places' });
    } catch {
      // fall through to the open dataset
    }
  }

  try {
    const res = await fetch(
      'https://photon.komoot.io/api/?limit=8&lang=en&q=' + encodeURIComponent(q),
      { cache: 'no-store' },
    );
    const json = await res.json();
    const results: Hit[] = (json.features ?? []).map((f: any, i: number) => {
      const p = f.properties ?? {};
      const line = [
        p.housenumber && p.street ? p.housenumber + ' ' + p.street : p.street,
        p.city ?? p.district, p.state, p.country,
      ].filter(Boolean).join(', ');
      return {
        key: 'o' + i + (p.osm_id ?? ''),
        name: p.name || p.street || q,
        address: line || p.name || q,
      };
    });
    return NextResponse.json({ results, source: 'OpenStreetMap' });
  } catch (err: any) {
    return NextResponse.json(
      { results: [], source: null, error: err?.message ?? 'Lookup failed' },
      { status: 200 },
    );
  }
}
