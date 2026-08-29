export type Role = 'member' | 'student' | 'speaker' | 'chapter_lead' | 'admin';
export type Tier = 'free' | 'monthly' | 'six_month' | 'annual' | 'twelve_month';
export type EventKind = 'meetup' | 'talk';
export type EventStatus = 'draft' | 'pending' | 'published' | 'cancelled';
export type SeatStatus = 'requested' | 'confirmed' | 'waitlist' | 'cancelled';
export type AccessKind = 'speaker' | 'chapter_lead';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  pronouns: string | null;
  role: Role;
  city: string | null;
  chapter_id: string | null;
  photo_url: string | null;
  intro: string | null;
  role_level: string | null;
  employer: string | null;
  employer_visible: boolean;
  speaker_approved: boolean;
  lead_chapter_id: string | null;
  is_student: boolean;
  is_immigrant: boolean;
  created_at: string;
};

export type Subscription = {
  profile_id: string;
  tier: Tier;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
};

export type EventRow = {
  id: string;
  chapter_id: string;
  venue_id: string | null;
  host_id: string | null;
  kind: EventKind;
  title: string;
  description: string | null;
  starts_at: string;
  seat_cap: number;
  status: EventStatus;
};

export type Seat = {
  id: string;
  event_id: string;
  profile_id: string;
  status: SeatStatus;
  table_no: number | null;
  created_at: string;
};

export const TAG_CATEGORIES = [
  'domain',
  'transformation_type',
  'method',
  'industry',
  'certification',
  'tool',
  'language',
  'topic',
] as const;
export type TagCategory = (typeof TAG_CATEGORIES)[number];
