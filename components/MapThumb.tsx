/**
 * A location image for a card. With a Google key it is a real static map
 * image; without one it is a live map frame with pointer events off, so it
 * still reads as a picture of the place and clicks pass through to the card.
 */
export function MapThumb({ query, height = 168 }: { query: string | null; height?: number }) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!query) {
    return (
      <div style={{
        height, display: 'grid', placeItems: 'center',
        background: 'linear-gradient(140deg,var(--gold-100),#e6ebfb)',
        borderBottom: '1px solid var(--line)',
      }}>
        <span className="mute small">Venue to be confirmed</span>
      </div>
    );
  }

  if (key) {
    const src = 'https://maps.googleapis.com/maps/api/staticmap'
      + '?center=' + encodeURIComponent(query)
      + '&zoom=15&size=640x320&scale=2&maptype=roadmap'
      + '&markers=color:0x3352cf%7C' + encodeURIComponent(query)
      + '&key=' + key;
    return (
      <img src={src} alt={'Map of ' + query} loading="lazy"
        style={{
          display: 'block', width: '100%', height, objectFit: 'cover',
          borderBottom: '1px solid var(--line)',
        }} />
    );
  }

  return (
    <div style={{
      height, overflow: 'hidden', position: 'relative',
      borderBottom: '1px solid var(--line)', background: 'var(--gold-100)',
    }}>
      <iframe
        title={'Map of ' + query}
        src={'https://maps.google.com/maps?q=' + encodeURIComponent(query) + '&z=15&hl=en&output=embed'}
        width="100%" height={height + 60} loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        style={{
          border: 0, display: 'block', marginTop: -30,
          pointerEvents: 'none', filter: 'saturate(.9)',
        }} />
    </div>
  );
}
