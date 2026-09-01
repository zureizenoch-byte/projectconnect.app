import type { Profile, Seat } from './types';

type Candidate = { profile_id: string; role_level: string | null; domains: string[] };

/**
 * First pass: group confirmed attendees into tables of 12-15 by primary domain,
 * then balance by role level so no table is all-junior or all-director.
 * A Chapter Lead can override any assignment afterwards.
 */
export function assignTables(candidates: Candidate[], min = 12, max = 15) {
  const byDomain = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const key = c.domains[0] ?? 'unassigned';
    if (!byDomain.has(key)) byDomain.set(key, []);
    byDomain.get(key)!.push(c);
  }

  const LEVELS = ['Student', 'Analyst', 'Manager', 'Senior Manager', 'Director', 'Executive'];
  const rank = (l: string | null) => (l ? Math.max(0, LEVELS.indexOf(l)) : 0);

  const pool: Candidate[] = [];
  for (const group of [...byDomain.values()].sort((a, b) => b.length - a.length)) {
    group.sort((a, b) => rank(a.role_level) - rank(b.role_level));
    // interleave levels within a domain so seniority spreads across tables
    const half = Math.ceil(group.length / 2);
    for (let i = 0; i < half; i++) {
      pool.push(group[i]);
      const mirror = group[group.length - 1 - i];
      if (mirror && mirror !== group[i]) pool.push(mirror);
    }
  }

  const tableCount = Math.max(1, Math.ceil(pool.length / max));
  const perTable = Math.max(min, Math.ceil(pool.length / tableCount));
  const out: Record<string, number> = {};
  pool.forEach((c, i) => { out[c.profile_id] = Math.floor(i / perTable) + 1; });
  return out;
}

export function seatCounts(seats: Pick<Seat, 'status'>[]) {
  return {
    confirmed: seats.filter((s) => s.status === 'confirmed').length,
    requested: seats.filter((s) => s.status === 'requested').length,
    waitlist: seats.filter((s) => s.status === 'waitlist').length,
  };
}

export function mapsUrl(address: string) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
}

type Person = {
  profile_id: string;
  role_level: string | null;
  domains: string[];
  requested_at?: string;
};

const LEVELS = ['Student', 'Analyst', 'Manager', 'Senior Manager', 'Director', 'Executive'];

/**
 * Pick who sits at a coffee meetup.
 *
 * A table of six is only worth showing up to if the people differ. Rather than
 * first-come-first-served, this walks the requests and repeatedly takes the
 * person who adds the most that the table does not yet have: a domain nobody
 * has, then a role level nobody has. Ties break toward whoever asked first,
 * so keenness still counts for something.
 *
 * Returns the chosen ids in seating order, plus the rest in request order.
 */
export function selectBalanced(people: Person[], cap: number) {
  const pool = [...people].sort((a, b) =>
    String(a.requested_at ?? '').localeCompare(String(b.requested_at ?? '')));

  const chosen: Person[] = [];
  const domainsSeen = new Set<string>();
  const levelsSeen = new Set<string>();

  const score = (p: Person) => {
    const newDomains = p.domains.filter((d) => !domainsSeen.has(d)).length;
    const level = p.role_level ?? 'unknown';
    const newLevel = levelsSeen.has(level) ? 0 : 1;
    // a fresh domain is worth more than a fresh level, but both count
    return newDomains * 3 + newLevel * 2 + (p.domains.length ? 1 : 0);
  };

  while (chosen.length < cap && pool.length) {
    let bestIndex = 0;
    let bestScore = -1;
    pool.forEach((p, i) => {
      const s = score(p);
      if (s > bestScore) { bestScore = s; bestIndex = i; }
    });
    const [picked] = pool.splice(bestIndex, 1);
    chosen.push(picked);
    picked.domains.forEach((d) => domainsSeen.add(d));
    levelsSeen.add(picked.role_level ?? 'unknown');
  }

  return {
    confirmed: chosen.map((p) => p.profile_id),
    waitlisted: pool.map((p) => p.profile_id),
    domains: [...domainsSeen],
    levels: [...levelsSeen].filter((l) => l !== 'unknown'),
  };
}

/** A plain-language summary of the mix at a table. */
export function describeMix(domains: string[], levels: string[]) {
  const d = domains.length;
  const l = levels.length;
  if (!d && !l) return 'No experience mapped yet, so this was seated in request order.';
  const parts: string[] = [];
  if (d) parts.push(d + (d === 1 ? ' domain' : ' different domains'));
  if (l) parts.push(l + (l === 1 ? ' role level' : ' role levels'));
  return 'Seated for range: ' + parts.join(' and ') + '.';
}
