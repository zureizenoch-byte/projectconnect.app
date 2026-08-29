import type { Profile } from './types';

export function canHostTalks(p: Profile) {
  return (p.role === 'speaker' && p.speaker_approved) || p.role === 'admin';
}
export function canRunChapter(p: Profile) {
  return (p.role === 'chapter_lead' && !!p.lead_chapter_id) || p.role === 'admin';
}
export function isAdmin(p: Profile) {
  return p.role === 'admin';
}
/** Free members cannot apply to lead a chapter. */
export function canApplyForLead(p: Profile, paid: boolean) {
  return paid && p.role !== 'admin' && !p.lead_chapter_id;
}

export function navFor(p: Profile) {
  const base: [string, string][] = [
    ['Dashboard', '/dashboard'],
    ['Events', '/events'],
    ['Venues', '/venues'],
  ];
  if (canHostTalks(p)) base.push(['Speaker', '/speaker']);
  if (canRunChapter(p)) base.push(['Chapter', '/chapter']);
  if (isAdmin(p)) base.push(['Admin', '/admin']);
  base.push(['Pricing', '/pricing']);
  return base;
}
