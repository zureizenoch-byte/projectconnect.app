import type { Profile, Tier } from './types';

/**
 * The four account types, in one place. Everything the app allows or hides
 * reads from this table — there is no second list to keep in step.
 *
 * Chapter Lead is not an account type: it is an operational grant that sits
 * on top of a paid member, handled through role_grants.
 */
export type AccountType = 'admin' | 'speaker' | 'member' | 'student';

export type Capabilities = {
  label: string;
  blurb: string;
  /** How many events they may hold a seat at per cycle. */
  eventsPerCycle: number;
  /** May take a seat at Speaker Series talks. */
  attendTalks: boolean;
  /** May host Speaker Series talks. */
  hostTalks: boolean;
  /** May post to the chapter feed. */
  postToFeed: boolean;
  /** Sees the pricing and billing pages. */
  billing: boolean;
  /** May apply to lead a chapter. */
  canApplyForLead: boolean;
  /** Admin console. */
  adminConsole: boolean;
  /** Signup grants this immediately, or it needs approval. */
  selfService: boolean;
};

const FREE: Capabilities = {
  label: 'Member — Free',
  blurb: 'One event per cycle. Speaker Series talks need a paid plan.',
  eventsPerCycle: 1,
  attendTalks: false,
  hostTalks: false,
  postToFeed: true,
  billing: true,
  canApplyForLead: false,
  adminConsole: false,
  selfService: true,
};

const PAID: Capabilities = {
  ...FREE,
  label: 'Member — Paid',
  blurb: 'Unlimited events and Speaker Series talks in your chapter.',
  eventsPerCycle: Infinity,
  attendTalks: true,
  canApplyForLead: true,
};

const STUDENT: Capabilities = {
  ...FREE,
  label: 'Student',
  blurb: 'Same rooms as members, with student profile fields and student pricing.',
  canApplyForLead: false,
};

const STUDENT_PAID: Capabilities = {
  ...STUDENT,
  label: 'Student — Paid',
  blurb: 'Unlimited events and Speaker Series talks.',
  eventsPerCycle: Infinity,
  attendTalks: true,
};

const SPEAKER: Capabilities = {
  label: 'Speaker',
  blurb: 'Hosts Speaker Series talks. Granted by an admin, never self-selected.',
  eventsPerCycle: Infinity,
  attendTalks: true,
  hostTalks: true,
  postToFeed: true,
  billing: false,
  canApplyForLead: false,
  adminConsole: false,
  selfService: false,
};

const ADMIN: Capabilities = {
  label: 'Admin',
  blurb: 'Full console: approvals, grants, venues, events, reports. Capped at two accounts.',
  eventsPerCycle: Infinity,
  attendTalks: true,
  hostTalks: true,
  postToFeed: true,
  billing: true,
  canApplyForLead: false,
  adminConsole: true,
  selfService: false,
};

export const MAX_ADMINS = 2;

/** The account types a person may pick at signup. */
export const SELF_SERVICE_TYPES: { value: string; label: string; note: string }[] = [
  { value: 'member', label: 'Member', note: 'Matched meetups and Speaker Series talks in your chapter.' },
  { value: 'student', label: 'Student', note: 'Same rooms, with student profile fields.' },
  { value: 'speaker', label: 'Speaker', note: 'Host talks. An admin reviews speaker accounts before you can publish.' },
];

export function capabilitiesFor(profile: Profile, paid: boolean): Capabilities {
  if (profile.role === 'admin') return ADMIN;
  if (profile.role === 'speaker' && profile.speaker_approved) return SPEAKER;
  if (profile.role === 'student' || profile.is_student) return paid ? STUDENT_PAID : STUDENT;
  return paid ? PAID : FREE;
}

/** Every account type, for the reference table in the admin console. */
export const ALL_CAPABILITIES: Capabilities[] = [ADMIN, SPEAKER, PAID, FREE, STUDENT_PAID, STUDENT];
