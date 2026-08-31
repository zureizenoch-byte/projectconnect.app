-- 0004_account_types.sql
-- Caps admin accounts and keeps student a first-class account type.

-- ---------------------------------------------------------------- admin cap
create or replace function enforce_admin_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare current_admins int;
begin
  if new.role = 'admin' then
    select count(*) into current_admins
    from role_grants
    where role = 'admin' and revoked_at is null and profile_id <> new.profile_id;

    if current_admins >= 2 then
      raise exception 'There are already 2 admin accounts. Revoke one before granting another.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists admin_cap on role_grants;
create trigger admin_cap
before insert on role_grants
for each row execute function enforce_admin_cap();

-- ---------------------------------------------------------------- student flag
-- role = 'student' and is_student must agree, whichever one gets set.
create or replace function sync_student_flag()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.role = 'student' then
    new.is_student := true;
  elsif new.is_student and new.role = 'member' then
    new.role := 'student';
  end if;
  return new;
end;
$$;

drop trigger if exists student_flag on profiles;
create trigger student_flag
before insert or update of role, is_student on profiles
for each row execute function sync_student_flag();

-- ---------------------------------------------------------------- who holds what
create or replace view account_overview as
select
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.city,
  p.speaker_approved,
  p.lead_chapter_id is not null as leads_chapter,
  coalesce(s.tier, 'free') as tier,
  coalesce(s.tier <> 'free' and s.status in ('active','trialing','paid'), false) as paid,
  p.created_at
from profiles p
left join subscriptions s on s.profile_id = p.id;
