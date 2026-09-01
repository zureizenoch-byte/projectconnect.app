-- 0012_venue_notifications.sql
-- Tell a venue when Project Connect intends to host a meetup there.

alter table venues
  add column if not exists contact_email text,
  add column if not exists contact_name text,
  add column if not exists notify boolean not null default true;

create table if not exists venue_notifications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  venue_id uuid not null references venues(id) on delete cascade,
  to_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'queued',   -- queued | sent | failed | skipped
  error text,
  provider_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, venue_id)
);
create index if not exists venue_notifications_status_idx
  on venue_notifications (status, created_at desc);

alter table venue_notifications enable row level security;

drop policy if exists "venue notifications admin" on venue_notifications;
create policy "venue notifications admin" on venue_notifications for select
  using (is_admin());
