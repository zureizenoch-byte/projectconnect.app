import type { Profile } from './types';
import { capabilitiesFor } from './roles';

export function canHostTalks(p: Profile) {
  return (p.role === 'speaker' && p.speaker_approved) || p.role === 'admin';
}
export function canRunChapter(p: Profile) {
  return (p.role === 'chapter_lead' && !!p.lead_chapter_id) || p.role === 'admin';
}
/** Chapter Leads pay like members, so a lapsed plan is worth surfacing. */
export function leadNeedsPlan(p: Profile, paid: boolean) {
  return p.role === 'chapter_lead' && !paid;
}
export function isAdmin(p: Profile) {
  return p.role === 'admin';
}
/** Free members and students cannot apply to lead a chapter. */
export function canApplyForLead(p: Profile, paid: boolean) {
  return capabilitiesFor(p, paid).canApplyForLead && !p.lead_chapter_id;
}

export function navFor(p: Profile) {
  const base: [string, string][] = [
    ['Dashboard', '/dashboard'],
    ['Events', '/events'],
    ['Messages', '/messages'],
  ];
  if (canHostTalks(p)) base.push(['Speaker', '/speaker']);
  if (canRunChapter(p)) base.push(['Chapter', '/chapter']);
  if (isAdmin(p)) base.push(['Admin', '/admin']);
  return base;
}
