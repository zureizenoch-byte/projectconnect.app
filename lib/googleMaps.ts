'use client';

let loading: Promise<void> | null = null;

/** Loads the Google Maps JS API once, on demand. Resolves false when no key is set. */
export function loadGoogleMaps(): Promise<boolean> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.resolve(false);
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).google?.maps?.places) return Promise.resolve(true);

  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const existing = document.getElementById('gmaps-js') as HTMLScriptElement | null;
      if (existing) { existing.addEventListener('load', () => resolve()); return; }

      const script = document.createElement('script');
      script.id = 'gmaps-js';
      script.async = true;
      script.src = 'https://maps.googleapis.com/maps/api/js?key=' + key
        + '&libraries=places&loading=async&v=weekly';
      script.onload = () => resolve();
      script.onerror = () => { loading = null; reject(new Error('Google Maps failed to load')); };
      document.head.appendChild(script);
    });
  }

  return loading.then(() => true).catch(() => false);
}

export const hasGoogleKey = () => !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
