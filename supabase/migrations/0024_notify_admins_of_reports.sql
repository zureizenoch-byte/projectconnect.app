-- 0024_notify_admins_of_reports.sql  (corrected)
-- Every new report notifies every admin, from the database, so it cannot be
-- missed through a UI path.
--
-- reason is an enum, so it must be cast before any text function touches it —
-- trim(new.reason) raises "function pg_catalog.btrim(report_reason) does not exist".

create or replace function notify_admins_of_report()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  who text;
  what text;
  target text;
  why text;
begin
  why := replace(new.reason::text, '_', ' ');

  if TG_TABLE_NAME = 'message_reports' then
    select coalesce(full_name, 'A member') into who
      from profiles where id = new.reported_id;
    what := 'message';
    target := '/admin#message-reports';
  else
    select coalesce(p.full_name, 'A member') into who
      from posts o join profiles p on p.id = o.author_id
      where o.id = new.post_id;
    what := 'post';
    target := '/admin#reports';
  end if;

  insert into notifications (profile_id, kind, title, body, href)
  select a.id,
         'moderation.reported',
         'A ' || what || ' was reported',
         coalesce(who, 'A member') || ' \u2014 ' || coalesce(nullif(why, ''), 'no reason given'),
         target
  from profiles a
  where a.role = 'admin';

  return new;
end;
$fn$;

drop trigger if exists message_report_notify on message_reports;
create trigger message_report_notify
after insert on message_reports
for each row execute function notify_admins_of_report();

drop trigger if exists post_report_notify on post_reports;
create trigger post_report_notify
after insert on post_reports
for each row execute function notify_admins_of_report();
