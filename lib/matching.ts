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
