-- 0009_first_come_seating.sql
-- RSVP is immediate. A member takes a seat if one is free, otherwise the
-- waitlist. Hosts no longer confirm attendance; they group people into tables.

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

  if ev.status not in ('published', 'pending') then
    raise exception 'This event is not open for RSVPs';
  end if;

  select coalesce(tier <> 'free' and status in ('active','trialing','paid'), false)
    into paid from subscriptions where profile_id = new.profile_id;

  if ev.kind = 'talk' and not coalesce(paid, false) then
    raise exception 'Speaker Series talks require a paid membership';
  end if;

  if not coalesce(paid, false) and new.status in ('requested','confirmed','waitlist') then
    select count(*) into cycle_count
    from event_seats s
    join events e on e.id = s.event_id
    where s.profile_id = new.profile_id
      and s.status in ('requested','confirmed','waitlist')
      and e.starts_at >= cycle_start
      and (TG_OP = 'INSERT' or s.id <> new.id);
    if cycle_count >= 1 then
      raise exception 'Free membership covers one event per cycle';
    end if;
  end if;

  -- first come, first served: over the cap means the waitlist
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

-- Anyone still sitting in the old 'requested' state is now simply confirmed,
-- oldest first, up to each event's cap; the rest move to the waitlist.
with ranked as (
  select s.id, s.event_id, e.seat_cap,
         row_number() over (partition by s.event_id order by s.created_at) as seq,
         (select count(*) from event_seats c
          where c.event_id = s.event_id and c.status = 'confirmed') as already
  from event_seats s
  join events e on e.id = s.event_id
  where s.status = 'requested'
)
update event_seats t
set status = case when r.already + r.seq <= r.seat_cap then 'confirmed' else 'waitlist' end
from ranked r
where t.id = r.id;
