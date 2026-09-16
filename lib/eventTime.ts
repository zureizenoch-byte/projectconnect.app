/**
 * Event times belong to their chapter, not to the reader.
 *
 * A meetup in Vancouver starts at 8:30 p.m. Vancouver time whether you are
 * reading about it from Toronto or Dubai — and, crucially, whether the code is
 * running in a browser or on a server whose clock is UTC. Formatting without a
 * zone silently prints UTC on the server, which is how an evening coffee turned
 * into a 3:30 a.m. one.
 */

const ZONES: Record<string, string> = {
  Vancouver: 'America/Vancouver',
  Toronto: 'America/Toronto',
};

export function zoneFor(city?: string | null) {
  return (city && ZONES[city]) || 'America/Vancouver';
}

type Parts = Intl.DateTimeFormatOptions;

function fmt(when: string | Date, city: string | null | undefined, parts: Parts) {
  const d = when instanceof Date ? when : new Date(when);
  return new Intl.DateTimeFormat('en-CA', { ...parts, timeZone: zoneFor(city) }).format(d);
}

/** "Sunday, October 4" */
export function eventDate(when: string | Date, city?: string | null) {
  return fmt(when, city, { weekday: 'long', month: 'long', day: 'numeric' });
}

/** "8:30 p.m." */
export function eventTime(when: string | Date, city?: string | null) {
  return fmt(when, city, { hour: 'numeric', minute: '2-digit' });
}

/** "Oct" and "4", for the date badge */
export function eventMonth(when: string | Date, city?: string | null) {
  return fmt(when, city, { month: 'short' });
}
export function eventDay(when: string | Date, city?: string | null) {
  return fmt(when, city, { day: 'numeric' });
}

/** "Sunday, 4 October 2026 at 8:30 p.m. PDT" */
export function eventFull(when: string | Date, city?: string | null) {
  return fmt(when, city, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
}

/** "Oct 4" — for lists and notifications */
export function eventShort(when: string | Date, city?: string | null) {
  return fmt(when, city, { month: 'short', day: 'numeric' });
}
