-- 0008_notifications_and_lifecycle.sql
-- In-app notifications, plus postpone / reschedule / cancel for events.

-- ---------------------------------------------------------------- event lifecycle
alter type event_status add value if not exists 'postponed';

alter table events
  add column if not exists original_starts_at timestamptz,
  add column if not exists status_note text,
  add column if not exists status_changed_at timestamptz,
  add column if not exists status_changed_by uuid references profiles(id) on delete set null;

create table if not exists event_changes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  kind text not null,                    -- rescheduled | postponed | cancelled | venue_changed | restored
  from_starts_at timestamptz,
  to_starts_at timestamptz,
  note text,
  actor_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists event_changes_event_idx on event_changes (event_id, created_at desc);

-- ---------------------------------------------------------------- notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  kind text not null,                    -- event.rescheduled | seat.confirmed | message.new | access.approved …
  title text not null,
  body text,
  href text,
  actor_id uuid references profiles(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_inbox_idx
  on notifications (profile_id, read_at, created_at desc);

alter table notifications enable row level security;
alter table event_changes enable row level security;

drop policy if exists "own notifications" on notifications;
create policy "own notifications" on notifications for select
  using (profile_id = auth.uid());

drop policy if exists "mark own notifications" on notifications;
create policy "mark own notifications" on notifications for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "changes readable" on event_changes;
create policy "changes readable" on event_changes for select using (auth.uid() is not null);

-- ---------------------------------------------------------------- fan-out helper
-- Notifies everyone holding a live seat at an event.
create or replace function notify_event_attendees(
  ev_id uuid, n_kind text, n_title text, n_body text, actor uuid default null
) returns int language plpgsql security definer set search_path = public as $$
declare sent int;
begin
  insert into notifications (profile_id, kind, title, body, href, actor_id)
  select s.profile_id, n_kind, n_title, n_body, '/events/' || ev_id, actor
  from event_seats s
  where s.event_id = ev_id and s.status in ('requested','confirmed','waitlist');

  get diagnostics sent = row_count;
  return sent;
end;
$$;

-- ---------------------------------------------------------------- automatic notifications
-- Seat status changes tell the member what happened.
create or replace function notify_seat_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare ev events;
begin
  if TG_OP = 'UPDATE' and new.status = old.status then return new; end if;

  select * into ev from events where id = new.event_id;
  if ev is null then return new; end if;

  if new.status = 'confirmed' then
    insert into notifications (profile_id, kind, title, body, href)
    values (new.profile_id, 'seat.confirmed',
            'Your seat is confirmed',
            ev.title || ' · ' || to_char(ev.starts_at at time zone 'UTC', 'Mon DD'),
            '/events/' || ev.id);
  elsif new.status = 'waitlist' then
    insert into notifications (profile_id, kind, title, body, href)
    values (new.profile_id, 'seat.waitlist',
            'You are on the waitlist',
            ev.title || ' is full. We will tell you if a seat opens.',
            '/events/' || ev.id);
  end if;

  return new;
end;
$$;

drop trigger if exists seat_notify on event_seats;
create trigger seat_notify
after insert or update of status on event_seats
for each row execute function notify_seat_change();

-- A new direct message notifies the recipient.
create or replace function notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare recipient uuid; sender_name text;
begin
  select profile_id into recipient
  from conversation_participants
  where conversation_id = new.conversation_id and profile_id <> new.sender_id
  limit 1;
  if recipient is null then return new; end if;

  select coalesce(full_name, 'A member') into sender_name from profiles where id = new.sender_id;

  insert into notifications (profile_id, kind, title, body, href, actor_id)
  values (recipient, 'message.new', sender_name || ' sent you a message',
          left(new.body, 140), '/messages/' || new.conversation_id, new.sender_id);
  return new;
end;
$$;

drop trigger if exists message_notify on messages;
create trigger message_notify
after insert on messages
for each row execute function notify_new_message();

-- Access decisions notify the applicant.
create or replace function notify_access_decision()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = old.status then return new; end if;

  if new.status = 'approved' then
    insert into notifications (profile_id, kind, title, body, href)
    values (new.profile_id, 'access.approved',
            'You are approved as ' || replace(new.kind::text, '_', ' '),
            'Your new tools are in the navigation.', '/profile');
  elsif new.status = 'rejected' then
    insert into notifications (profile_id, kind, title, body, href)
    values (new.profile_id, 'access.rejected',
            'Your application was not approved',
            'You can amend it and apply again from your profile.', '/profile');
  end if;
  return new;
end;
$$;

drop trigger if exists access_notify on access_requests;
create trigger access_notify
after update of status on access_requests
for each row execute function notify_access_decision();

-- A published event tells that chapter's members.
create or replace function notify_event_published()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' and (old.status is distinct from 'published') then
    insert into notifications (profile_id, kind, title, body, href)
    select p.id, 'event.published',
           case when new.kind = 'talk' then 'New Speaker Series talk' else 'New meetup in your chapter' end,
           new.title || ' · ' || to_char(new.starts_at at time zone 'UTC', 'Mon DD'),
           '/events/' || new.id
    from profiles p
    where p.chapter_id = new.chapter_id and p.id <> coalesce(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid);
  end if;
  return new;
end;
$$;

drop trigger if exists event_published_notify on events;
create trigger event_published_notify
after update of status on events
for each row execute function notify_event_published();
