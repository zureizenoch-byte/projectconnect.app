-- Project Connect — initial schema
-- Run in Supabase SQL editor, or: supabase db push

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums
create type user_role       as enum ('member','student','speaker','chapter_lead','admin');
create type sub_tier        as enum ('free','monthly','six_month','annual','twelve_month');
create type event_kind      as enum ('meetup','talk');
create type event_status    as enum ('draft','pending','published','cancelled');
create type seat_status     as enum ('requested','confirmed','waitlist','cancelled');
create type access_kind     as enum ('speaker','chapter_lead');
create type request_status  as enum ('pending','approved','rejected');
create type consent_doc     as enum ('privacy','terms');

-- ---------------------------------------------------------------- chapters
create table chapters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null unique,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  pronouns text,
  role user_role not null default 'member',
  city text,
  chapter_id uuid references chapters(id) on delete set null,
  photo_url text,
  intro text,
  role_level text,
  employer text,
  employer_visible boolean not null default true,
  years_experience int,
  budget_owned text,
  linkedin_url text,
  website_url text,
  open_to_mentoring boolean not null default false,
  seeking_mentor boolean not null default false,
  -- student / immigrant context
  is_student boolean not null default false,
  is_immigrant boolean not null default false,
  institution text,
  programme text,
  graduation_year int,
  arrival_year int,
  home_country text,
  credential_recognition text,
  work_authorization text,
  -- role gating
  speaker_approved boolean not null default false,
  lead_chapter_id uuid references chapters(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on profiles (chapter_id);
create index on profiles (role);

-- free-form multi-select values: domain, transformation_type, method,
-- industry, certification, tool, language, topic — plus "other" write-ins
create table profile_tags (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  category text not null,
  value text not null,
  is_custom boolean not null default false,
  unique (profile_id, category, value)
);
create index on profile_tags (profile_id, category);
create index on profile_tags (category, value);

create table privacy_settings (
  profile_id uuid primary key references profiles(id) on delete cascade,
  visible_to_members boolean not null default true,
  allow_contact boolean not null default true,
  show_employer boolean not null default true,
  show_city boolean not null default true,
  updated_at timestamptz not null default now()
);

create table consents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  doc consent_doc not null,
  version text not null,
  agreed_at timestamptz not null default now(),
  ip inet,
  user_agent text
);
create index on consents (profile_id, doc);

-- ---------------------------------------------------------------- billing
create table subscriptions (
  profile_id uuid primary key references profiles(id) on delete cascade,
  tier sub_tier not null default 'free',
  status text not null default 'none',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- venues & events
create table venues (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  name text not null,
  address text not null,
  maps_query text,
  capacity int not null default 15,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on venues (chapter_id);

create table events (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  venue_id uuid references venues(id) on delete set null,
  host_id uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  kind event_kind not null default 'meetup',
  title text not null,
  description text,
  starts_at timestamptz not null,
  duration_min int not null default 120,
  seat_cap int not null default 15 check (seat_cap between 1 and 15),
  status event_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index on events (chapter_id, starts_at);
create index on events (status, starts_at);

create table event_seats (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  status seat_status not null default 'requested',
  table_no int,
  checked_in boolean not null default false,
  created_at timestamptz not null default now(),
  unique (event_id, profile_id)
);
create index on event_seats (event_id, status);
create index on event_seats (profile_id, created_at desc);

-- ---------------------------------------------------------------- feed
create table posts (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references chapters(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index on posts (chapter_id, created_at desc);

create table post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  reporter_id uuid not null references profiles(id) on delete cascade,
  reason text,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

-- ---------------------------------------------------------------- approvals
create table access_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  kind access_kind not null,
  chapter_id uuid references chapters(id) on delete set null,
  note text,
  status request_status not null default 'pending',
  decided_by uuid references profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index on access_requests (status, created_at);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  target text,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index on audit_log (created_at desc);

-- ---------------------------------------------------------------- helpers
create or replace function is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = uid and role = 'admin');
$$;

create or replace function leads_chapter(cid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = uid and (role = 'admin' or (role = 'chapter_lead' and lead_chapter_id = cid))
  );
$$;

-- new auth user -> profile + free subscription + default privacy
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  chosen_role user_role;
  chosen_city text;
  chosen_chapter uuid;
begin
  chosen_role := coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'member');
  chosen_city := new.raw_user_meta_data ->> 'city';
  select id into chosen_chapter from chapters where city = chosen_city limit 1;

  insert into profiles (id, email, full_name, pronouns, role, city, chapter_id, is_student, is_immigrant)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'pronouns',
    chosen_role,
    chosen_city,
    chosen_chapter,
    coalesce((new.raw_user_meta_data ->> 'is_student')::boolean, chosen_role = 'student'),
    coalesce((new.raw_user_meta_data ->> 'is_immigrant')::boolean, false)
  );

  insert into subscriptions (profile_id) values (new.id);
  insert into privacy_settings (profile_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- seat capacity + free-tier limits enforced in the database, not just the UI
create or replace function enforce_seat_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ev events;
  taken int;
  paid boolean;
  cycle_start timestamptz := date_trunc('month', now());
  cycle_count int;
begin
  select * into ev from events where id = new.event_id;
  if ev.status <> 'published' then
    raise exception 'Event is not open for RSVPs';
  end if;

  select coalesce(tier <> 'free' and status in ('active','trialing','paid'), false)
    into paid from subscriptions where profile_id = new.profile_id;

  if ev.kind = 'talk' and not coalesce(paid, false) then
    raise exception 'Speaker talks require a paid membership';
  end if;

  if not coalesce(paid, false) and new.status in ('requested','confirmed') then
    select count(*) into cycle_count
    from event_seats s
    join events e on e.id = s.event_id
    where s.profile_id = new.profile_id
      and s.status in ('requested','confirmed')
      and e.starts_at >= cycle_start
      and (TG_OP = 'INSERT' or s.id <> new.id);
    if cycle_count >= 1 then
      raise exception 'Free membership covers one event per cycle';
    end if;
  end if;

  if new.status = 'confirmed' then
    select count(*) into taken from event_seats
    where event_id = new.event_id and status = 'confirmed'
      and (TG_OP = 'INSERT' or id <> new.id);
    if taken >= ev.seat_cap then
      new.status := 'waitlist';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists seat_rules on event_seats;
create trigger seat_rules
before insert or update on event_seats
for each row execute function enforce_seat_rules();

-- ---------------------------------------------------------------- RLS
alter table chapters         enable row level security;
alter table profiles         enable row level security;
alter table profile_tags     enable row level security;
alter table privacy_settings enable row level security;
alter table consents         enable row level security;
alter table subscriptions    enable row level security;
alter table venues           enable row level security;
alter table events           enable row level security;
alter table event_seats      enable row level security;
alter table posts            enable row level security;
alter table post_reports     enable row level security;
alter table access_requests  enable row level security;
alter table audit_log        enable row level security;

create policy "chapters readable" on chapters for select using (true);
create policy "chapters admin write" on chapters for all using (is_admin()) with check (is_admin());

create policy "own profile" on profiles for select
  using (id = auth.uid() or is_admin() or exists (
    select 1 from privacy_settings ps where ps.profile_id = profiles.id and ps.visible_to_members
  ));
create policy "update own profile" on profiles for update
  using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());

create policy "tags readable" on profile_tags for select
  using (profile_id = auth.uid() or is_admin() or exists (
    select 1 from privacy_settings ps where ps.profile_id = profile_tags.profile_id and ps.visible_to_members
  ));
create policy "own tags write" on profile_tags for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "own privacy" on privacy_settings for all
  using (profile_id = auth.uid() or is_admin()) with check (profile_id = auth.uid() or is_admin());

create policy "own consents read" on consents for select using (profile_id = auth.uid() or is_admin());
create policy "own consents insert" on consents for insert with check (profile_id = auth.uid());

create policy "own subscription" on subscriptions for select using (profile_id = auth.uid() or is_admin());

create policy "venues readable" on venues for select using (active or is_admin());
create policy "venues admin write" on venues for all using (is_admin()) with check (is_admin());

create policy "published events readable" on events for select
  using (status = 'published' or leads_chapter(chapter_id) or host_id = auth.uid() or is_admin());
create policy "leads manage events" on events for all
  using (leads_chapter(chapter_id) or host_id = auth.uid())
  with check (leads_chapter(chapter_id) or host_id = auth.uid());

create policy "seats visible" on event_seats for select
  using (profile_id = auth.uid() or is_admin() or exists (
    select 1 from events e where e.id = event_seats.event_id
      and (e.host_id = auth.uid() or leads_chapter(e.chapter_id))
  ));
create policy "own seat write" on event_seats for insert with check (profile_id = auth.uid());
create policy "own seat update" on event_seats for update
  using (profile_id = auth.uid() or is_admin() or exists (
    select 1 from events e where e.id = event_seats.event_id
      and (e.host_id = auth.uid() or leads_chapter(e.chapter_id))
  ))
  with check (true);

create policy "posts readable" on posts for select using (auth.uid() is not null);
create policy "own posts write" on posts for all
  using (author_id = auth.uid() or is_admin()) with check (author_id = auth.uid() or is_admin());

create policy "reports insert" on post_reports for insert with check (reporter_id = auth.uid());
create policy "reports admin read" on post_reports for select using (is_admin() or reporter_id = auth.uid());

create policy "own requests" on access_requests for select using (profile_id = auth.uid() or is_admin());
create policy "own requests insert" on access_requests for insert with check (profile_id = auth.uid());
create policy "admin decides requests" on access_requests for update using (is_admin()) with check (is_admin());

create policy "audit admin read" on audit_log for select using (is_admin());
