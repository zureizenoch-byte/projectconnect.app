/**
 * A photograph of a venue.
 *
 * Best case is the venue's own Google Places photo, captured when the venue was
 * added. Failing that, Street View of the address — a real picture of the
 * storefront. With no Google key at all, a map of the location.
 */
export function VenuePhoto({
  photoUrl, address, name, city, kind, height = 168,
}: {
  photoUrl?: string | null;
  address: string | null;
  name: string;
  city?: string | null;
  kind?: string | null;
  height?: number;
}) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  // a venue with no street address still has a city worth showing
  const query = address ?? (city ? city + ', Canada' : null);

  const frame: React.CSSProperties = {
    display: 'block',
    width: '100%',
    height,
    objectFit: 'cover',
    borderBottom: '1px solid var(--line)',
    background: 'linear-gradient(140deg,var(--gold-100),#e6ebfb)',
  };

  if (photoUrl) {
    return <img src={photoUrl} alt={name} loading="lazy" style={frame} />;
  }

  if (query && key) {
    const streetView = 'https://maps.googleapis.com/maps/api/streetview'
      + '?size=640x320&fov=80&pitch=5&source=outdoor'
      + '&location=' + encodeURIComponent(query)
      + '&key=' + key;
    return <img src={streetView} alt={name} loading="lazy" style={frame} />;
  }

  if (query) {
    return (
      <div style={{
        height, overflow: 'hidden', position: 'relative',
        borderBottom: '1px solid var(--line)', background: 'var(--gold-100)',
      }}>
        <iframe
          title={name}
          src={'https://maps.google.com/maps?q=' + encodeURIComponent(query)
            + '&z=16&hl=en&output=embed'}
          width="100%" height={height + 60} loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{
            border: 0, display: 'block', marginTop: -30,
            pointerEvents: 'none', filter: 'saturate(.9)',
          }} />
      </div>
    );
  }

  // Nothing to place at all — draw something intentional rather than an apology
  return (
    <div style={{
      height, position: 'relative', overflow: 'hidden',
      borderBottom: '1px solid var(--line)',
      background: 'linear-gradient(140deg, var(--gold-100), #dfe6fa 60%, #cdd7f5)',
      display: 'grid', placeItems: 'center',
    }}>
      <span aria-hidden style={{
        position: 'absolute', inset: 0, opacity: .5,
        backgroundImage:
          'linear-gradient(var(--gold-200) 1px, transparent 1px),'
          + 'linear-gradient(90deg, var(--gold-200) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />
      <span style={{
        position: 'relative', fontFamily: 'var(--font-heading)',
        fontSize: 20, letterSpacing: '-0.01em', color: 'var(--gold-700)',
        textAlign: 'center', padding: '0 20px',
      }}>
        {kind === 'talk' ? 'Speaker Series' : 'Coffee meetup'}
        {city ? <span style={{ display: 'block', fontSize: 14, opacity: .8 }}>{city}</span> : null}
      </span>
    </div>
  );
}
