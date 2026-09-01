-- 0011_free_hosts_one_meetup.sql
-- Free membership covers hosting one meetup per cycle, enforced in the
-- database so the limit holds however the row is written.

create or replace function enforce_host_quota() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  r user_role;
  paid boolean;
  mine int;
begin
  select role into r from profiles where id = new.created_by;
  if r in ('admin', 'chapter_lead') then return new; end if;

  select coalesce(tier <> 'free' and status in ('active','trialing','paid'), false)
    into paid from subscriptions where profile_id = new.created_by;
  if coalesce(paid, false) then return new; end if;

  select count(*) into mine from events
  where created_by = new.created_by
    and status <> 'cancelled'
    and starts_at >= date_trunc('month', now())
    and (TG_OP = 'INSERT' or id <> new.id);

  if mine >= 1 then
    raise exception 'Free membership covers hosting one meetup per cycle';
  end if;

  return new;
end;
$fn$;

drop trigger if exists host_quota on events;
create trigger host_quota
before insert on events
for each row execute function enforce_host_quota();
