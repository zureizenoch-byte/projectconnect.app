-- 0017_no_self_seat_notice.sql
-- Nobody needs telling they are attending their own event. The host's seat is
-- created for them when they schedule it, which was firing a
-- "Your seat is confirmed" notice at the person who just made the event.

create or replace function notify_seat_change() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare ev events;
begin
  if TG_OP = 'UPDATE' and new.status = old.status then return new; end if;

  select * into ev from events where id = new.event_id;
  if ev is null then return new; end if;

  -- their own event: they already know
  if new.profile_id = ev.host_id or new.profile_id = ev.created_by then
    return new;
  end if;

  if new.status = 'confirmed' then
    insert into notifications (profile_id, kind, title, body, href)
    values (new.profile_id, 'seat.confirmed',
            'Your seat is confirmed',
            ev.title || ' \u00b7 ' || to_char(ev.starts_at at time zone 'UTC', 'Mon DD'),
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
$fn$;

-- clear the ones already sent in error
delete from notifications n
using events e
where n.kind in ('seat.confirmed', 'seat.waitlist')
  and n.href = '/events/' || e.id
  and n.profile_id in (e.host_id, e.created_by);
