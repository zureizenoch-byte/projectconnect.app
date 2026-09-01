-- 0010_host_takes_a_seat.sql
-- The host occupies one of the event's seats, and hosting does not spend a
-- free member's one-event-per-cycle allowance.

create or replace function enforce_seat_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ev events;
  taken int;
  paid boolean;
  is_host boolean;
  cycle_start timestamptz := date_trunc('month', now());
  cycle_count int;
begin
  select * into ev from events where id = new.event_id;

  is_host := (ev.host_id = new.profile_id or ev.created_by = new.profile_id);

  if ev.status not in ('published', 'pending') and not is_host then
    raise exception 'This event is not open for RSVPs';
  end if;

  select coalesce(tier <> 'free' and status in ('active','trialing','paid'), false)
    into paid from subscriptions where profile_id = new.profile_id;

  if ev.kind = 'talk' and not coalesce(paid, false) and not is_host then
    raise exception 'Speaker Series talks require a paid membership';
  end if;

  if not coalesce(paid, false) and not is_host
     and new.status in ('requested','confirmed','waitlist') then
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

  -- first come, first served; the host is never bumped to the waitlist
  if new.status = 'confirmed' and not is_host then
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

-- Give existing hosts their seat
insert into event_seats (event_id, profile_id, status)
select e.id, coalesce(e.host_id, e.created_by), 'confirmed'
from events e
where coalesce(e.host_id, e.created_by) is not null
  and not exists (
    select 1 from event_seats s
    where s.event_id = e.id and s.profile_id = coalesce(e.host_id, e.created_by)
  )
on conflict (event_id, profile_id) do nothing;
