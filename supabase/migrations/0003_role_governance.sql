-- 0003_role_governance.sql
-- Elevated roles (speaker, chapter_lead, admin) can only be held via an approved
-- access_request. The database enforces this: signup routes requests into the queue,
-- and any attempt to set an elevated role outside the approval path is rejected.

-- ---------------------------------------------------------------- 1. grants ledger
-- One row per granted role. This is the source of truth for "who may hold what".
create table if not exists role_grants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  role user_role not null,
  chapter_id uuid references chapters(id) on delete set null,
  granted_by uuid references profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_by uuid references profiles(id) on delete set null,
  revoked_at timestamptz,
  request_id uuid references access_requests(id) on delete set null
);
create index if not exists role_grants_active_idx
  on role_grants (profile_id, role) where revoked_at is null;

alter table role_grants enable row level security;

drop policy if exists "grants readable" on role_grants;
create policy "grants readable" on role_grants for select
  using (profile_id = auth.uid() or is_admin());

drop policy if exists "grants admin write" on role_grants;
create policy "grants admin write" on role_grants for all
  using (is_admin()) with check (is_admin());

create or replace function has_active_grant(pid uuid, r user_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from role_grants
    where profile_id = pid and role = r and revoked_at is null
  );
$$;

-- ---------------------------------------------------------------- 2. self-service roles
create or replace function is_elevated(r user_role)
returns boolean language sql immutable as $$
  select r in ('speaker', 'chapter_lead', 'admin');
$$;

-- ---------------------------------------------------------------- 3. enforcement
-- No path — app bug, direct API call, or SQL from a member — can set an elevated
-- role without a matching active grant. Admins acting through approve_access_request
-- create the grant first, so their updates pass.
create or replace function enforce_role_governance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if is_elevated(new.role) and not has_active_grant(new.id, new.role) then
    raise exception 'Role % requires an approved access request', new.role
      using hint = 'Approve it in Admin → Access requests';
  end if;

  -- speaker_approved and lead_chapter_id are derived, never set by hand
  new.speaker_approved := has_active_grant(new.id, 'speaker');
  if not has_active_grant(new.id, 'chapter_lead') then
    new.lead_chapter_id := null;
  end if;

  return new;
end;
$$;

drop trigger if exists role_governance on profiles;
create trigger role_governance
before insert or update of role, speaker_approved, lead_chapter_id on profiles
for each row execute function enforce_role_governance();

-- ---------------------------------------------------------------- 4. signup routing
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested user_role;
  stored_role user_role;
  chosen_city text;
  chosen_chapter uuid;
begin
  requested := coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'member');
  chosen_city := new.raw_user_meta_data ->> 'city';
  select id into chosen_chapter from chapters where city = chosen_city limit 1;

  -- elevated roles are never self-granted; hold as member and queue the request
  stored_role := case when is_elevated(requested) then 'member' else requested end;

  insert into profiles (id, email, full_name, pronouns, role, city, chapter_id, is_student, is_immigrant)
  values (
    new.id, new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'pronouns',
    stored_role, chosen_city, chosen_chapter,
    coalesce((new.raw_user_meta_data ->> 'is_student')::boolean, requested = 'student'),
    coalesce((new.raw_user_meta_data ->> 'is_immigrant')::boolean, false)
  );

  insert into subscriptions (profile_id) values (new.id);
  insert into privacy_settings (profile_id) values (new.id);

  if is_elevated(requested) and requested <> 'admin' then
    insert into access_requests (profile_id, kind, chapter_id, note)
    values (new.id, requested::text::access_kind, chosen_chapter, 'Requested at signup');
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------- 5. the approval path
create or replace function approve_access_request(req_id uuid, approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  req access_requests;
  target_role user_role;
begin
  if not is_admin() then
    raise exception 'Admins only';
  end if;

  select * into req from access_requests where id = req_id;
  if req is null then raise exception 'Request not found'; end if;
  if req.status <> 'pending' then raise exception 'Request already decided'; end if;

  update access_requests
    set status = case when approve then 'approved' else 'rejected' end,
        decided_by = auth.uid(), decided_at = now()
    where id = req_id;

  if approve then
    target_role := req.kind::text::user_role;

    insert into role_grants (profile_id, role, chapter_id, granted_by, request_id)
    values (req.profile_id, target_role, req.chapter_id, auth.uid(), req_id);

    update profiles
      set role = target_role,
          lead_chapter_id = case when target_role = 'chapter_lead' then req.chapter_id else lead_chapter_id end
      where id = req.profile_id;
  end if;

  insert into audit_log (actor_id, action, target, meta)
  values (auth.uid(),
          case when approve then 'access.approve' else 'access.reject' end,
          req.profile_id::text,
          jsonb_build_object('kind', req.kind, 'request_id', req_id));
end;
$$;

create or replace function revoke_role(target_profile uuid, target_role user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;

  update role_grants
    set revoked_by = auth.uid(), revoked_at = now()
    where profile_id = target_profile and role = target_role and revoked_at is null;

  update profiles set role = 'member' where id = target_profile and role = target_role;

  insert into audit_log (actor_id, action, target, meta)
  values (auth.uid(), 'access.revoke', target_profile::text,
          jsonb_build_object('role', target_role));
end;
$$;

-- ---------------------------------------------------------------- 6. backfill
-- Anyone already holding an elevated role gets a grant if an admin clearly intended
-- it (admins), or is demoted with a pending request raised (everyone else).
do $$
declare r record;
begin
  -- existing admins are grandfathered so nobody is locked out
  for r in select id, role, lead_chapter_id from profiles where role = 'admin' loop
    insert into role_grants (profile_id, role, granted_at)
    select r.id, 'admin', now()
    where not exists (
      select 1 from role_grants g
      where g.profile_id = r.id and g.role = 'admin' and g.revoked_at is null
    );
  end loop;

  -- speakers and chapter leads without a grant go back to the queue
  for r in
    select p.id, p.role, p.chapter_id
    from profiles p
    where p.role in ('speaker', 'chapter_lead')
      and not has_active_grant(p.id, p.role)
  loop
    insert into access_requests (profile_id, kind, chapter_id, note, status)
    select r.id, r.role::text::access_kind, r.chapter_id, 'Raised by role governance backfill', 'pending'
    where not exists (
      select 1 from access_requests a
      where a.profile_id = r.id and a.kind = r.role::text::access_kind and a.status = 'pending'
    );

    update profiles set role = 'member' where id = r.id;
  end loop;
end $$;
