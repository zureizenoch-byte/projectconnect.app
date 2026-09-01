/**
 * A photograph of a venue.
 *
 * Best case is the venue's own Google Places photo, captured when the venue was
 * added. Failing that, Street View of the address — a real picture of the
 * storefront. With no Google key at all, a map of the location.
 */
export function VenuePhoto({
  photoUrl, address, name, height = 168,
}: {
  photoUrl?: string | null;
  address: string | null;
  name: string;
  height?: number;
}) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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

  if (address && key) {
    const streetView = 'https://maps.googleapis.com/maps/api/streetview'
      + '?size=640x320&fov=80&pitch=5&source=outdoor'
      + '&location=' + encodeURIComponent(address)
      + '&key=' + key;
    return <img src={streetView} alt={name} loading="lazy" style={frame} />;
  }

  if (address) {
    return (
      <div style={{
        height, overflow: 'hidden', position: 'relative',
        borderBottom: '1px solid var(--line)', background: 'var(--gold-100)',
      }}>
        <iframe
          title={name}
          src={'https://maps.google.com/maps?q=' + encodeURIComponent(address)
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

  return (
    <div style={{ ...frame, display: 'grid', placeItems: 'center' }}>
      <span className="mute small">No photo yet</span>
    </div>
  );
}
