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

/** How far ahead of UTC a zone sits at a given instant, in milliseconds. */
function offsetAt(at: Date, zone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});

  const asIfUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour) % 24, Number(parts.minute), Number(parts.second),
  );
  return asIfUtc - at.getTime();
}

/**
 * Turn a naive "2026-10-04T20:30" from a datetime-local field into the right
 * instant, reading it as the chapter's own clock.
 *
 * An organiser scheduling a Vancouver meetup means 8:30 p.m. in Vancouver —
 * not 8:30 p.m. wherever they happen to be sitting. Letting the browser decide
 * makes the same typed time mean something different for every organiser.
 */
export function zonedToUtcIso(local: string, city?: string | null) {
  const zone = zoneFor(city);
  const naive = Date.parse(local.length === 16 ? local + ':00Z' : local + 'Z');
  if (Number.isNaN(naive)) return new Date(local).toISOString();

  // one refinement pass, so a time near a DST change still lands correctly
  let guess = naive - offsetAt(new Date(naive), zone);
  guess = naive - offsetAt(new Date(guess), zone);
  return new Date(guess).toISOString();
}

/** The reverse: fill a datetime-local field with the chapter's clock. */
export function utcToZonedInput(iso: string, city?: string | null) {
  const zone = zoneFor(city);
  const at = new Date(iso);
  const shifted = new Date(at.getTime() + offsetAt(at, zone));
  return shifted.toISOString().slice(0, 16);
}

/** "PDT" / "PST" — for labelling the field the organiser is typing into. */
export function zoneLabel(city?: string | null, at: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zoneFor(city), timeZoneName: 'short',
  }).formatToParts(at);
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
}
