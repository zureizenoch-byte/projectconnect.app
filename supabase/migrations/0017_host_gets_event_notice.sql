-- 0017_host_gets_event_notice.sql
-- A host was being told "Your seat is confirmed" for the event they had just
-- created, because scheduling a meetup inserts their seat. Hosts now get a
-- notice about the event itself, and attendees keep the seat notice.

create or replace function notify_seat_change() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare ev events; is_host boolean;
begin
  if TG_OP = 'UPDATE' and new.status = old.status then return new; end if;

  select * into ev from events where id = new.event_id;
  if ev is null then return new; end if;

  is_host := (new.profile_id = ev.host_id or new.profile_id = ev.created_by);

  if is_host then
    -- only on the first insert, and only worth saying once
    if TG_OP = 'INSERT' and new.status = 'confirmed' then
      insert into notifications (profile_id, kind, title, body, href)
      values (
        new.profile_id,
        'event.mine',
        case
          when ev.status = 'published' then 'Your event is live'
          else 'Your event is with an admin'
        end,
        ev.title || ' \u00b7 '
          || to_char(ev.starts_at at time zone 'UTC', 'Mon DD')
          || case
               when ev.status = 'published'
                 then '. Your seat is held as the host.'
               else '. You will hear as soon as it is approved.'
             end,
        '/events/' || ev.id
      );
    end if;
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

-- retitle the ones already sent to hosts in error
update notifications n
set kind = 'event.mine',
    title = 'Your event is live',
    body = e.title || ' \u00b7 '
      || to_char(e.starts_at at time zone 'UTC', 'Mon DD')
      || '. Your seat is held as the host.'
from events e
where n.href = '/events/' || e.id
  and n.kind in ('seat.confirmed', 'seat.waitlist')
  and n.profile_id in (e.host_id, e.created_by);
