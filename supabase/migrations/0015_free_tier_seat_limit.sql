-- 0015_free_tier_seat_limit.sql
-- One event per cycle for free members, counted honestly.
--
-- The previous rule exempted hosts entirely, which let a free member hold any
-- number of seats simply by hosting. Now hosting costs the allowance too: a
-- free member may hold exactly one live seat per cycle, whether they host it
-- or joined someone else's.

create or replace function enforce_seat_rules() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  ev events;
  taken int;
  paid boolean;
  r user_role;
  held int;
begin
  select * into ev from events where id = new.event_id;

  if ev.status not in ('published', 'pending') then
    raise exception 'This event is not open for RSVPs';
  end if;

  select role into r from profiles where id = new.profile_id;

  select coalesce(tier <> 'free' and status in ('active','trialing','paid'), false)
    into paid from subscriptions where profile_id = new.profile_id;

  -- admins and chapter leads run the programme; no personal cap
  if r in ('admin', 'chapter_lead') then
    paid := true;
  end if;

  if ev.kind = 'talk' and not coalesce(paid, false) then
    raise exception 'Speaker Series talks require a paid membership';
  end if;

  if not coalesce(paid, false) and new.status in ('requested','confirmed','waitlist') then
    select count(*) into held
    from event_seats s
    join events e on e.id = s.event_id
    where s.profile_id = new.profile_id
      and s.status in ('requested','confirmed','waitlist')
      and e.status <> 'cancelled'
      and e.starts_at >= date_trunc('month', now())
      and s.event_id <> new.event_id
      and (TG_OP = 'INSERT' or s.id <> new.id);

    if held >= 1 then
      raise exception 'Free membership covers one event per cycle. Cancel your other seat first, or upgrade.';
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
$fn$;

drop trigger if exists seat_rules on event_seats;
create trigger seat_rules
before insert or update on event_seats
for each row execute function enforce_seat_rules();
