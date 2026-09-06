-- 0018_online_events.sql
-- Meetups and talks can now run online. Format is separate from kind, so an
-- online Speaker Series talk and an online coffee meetup are both possible.

do $$ begin
  create type event_format as enum ('in_person', 'online');
exception when duplicate_object then null;
end $$;

alter table events
  add column if not exists format event_format not null default 'in_person',
  add column if not exists meeting_url text,
  add column if not exists meeting_note text;

-- an online event needs a link, an in-person one needs a venue
alter table events drop constraint if exists events_online_needs_link;
alter table events add constraint events_online_needs_link
  check (format = 'in_person' or meeting_url is not null or status in ('draft', 'pending'));

create index if not exists events_format_idx on events (format, starts_at);

-- online events have no seat cap worth enforcing at a venue, but keep a
-- sensible ceiling so matching still has something to work with
alter table events drop constraint if exists events_seat_cap_check;
alter table events add constraint events_seat_cap_check
  check (seat_cap between 1 and 100);
