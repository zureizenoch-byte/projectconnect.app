-- 0007_messaging.sql
-- Direct messages with blocking, reporting and rate limiting.

create type report_reason as enum ('spam','harassment','inappropriate','impersonation','other');

-- ---------------------------------------------------------------- blocks
create table if not exists blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocked_idx on blocks (blocked_id);

create or replace function is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- ---------------------------------------------------------------- conversations
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  last_read_at timestamptz,
  archived boolean not null default false,
  primary key (conversation_id, profile_id)
);
create index if not exists cp_profile_idx on conversation_participants (profile_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists messages_conv_idx on messages (conversation_id, created_at);

create table if not exists message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  reporter_id uuid not null references profiles(id) on delete cascade,
  reported_id uuid references profiles(id) on delete set null,
  reason report_reason not null default 'other',
  detail text,
  resolved boolean not null default false,
  resolved_by uuid references profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists message_reports_open_idx on message_reports (resolved, created_at);

-- ---------------------------------------------------------------- membership helper
create or replace function in_conversation(cid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversation_participants
    where conversation_id = cid and profile_id = uid
  );
$$;

-- ---------------------------------------------------------------- send guards
-- Blocking, contact preference and a simple flood limit, enforced in the database.
create or replace function enforce_message_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  other uuid;
  recent int;
begin
  if not in_conversation(new.conversation_id, new.sender_id) then
    raise exception 'You are not part of this conversation';
  end if;

  select profile_id into other
  from conversation_participants
  where conversation_id = new.conversation_id and profile_id <> new.sender_id
  limit 1;

  if other is not null and is_blocked_between(new.sender_id, other) then
    raise exception 'You cannot message this member';
  end if;

  -- flood limit: 20 messages a minute across all conversations
  select count(*) into recent from messages
  where sender_id = new.sender_id and created_at > now() - interval '1 minute';
  if recent >= 20 then
    raise exception 'You are sending messages too quickly. Wait a moment and try again.';
  end if;

  update conversations set last_message_at = now() where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists message_rules on messages;
create trigger message_rules
before insert on messages
for each row execute function enforce_message_rules();

-- ---------------------------------------------------------------- RLS
alter table blocks enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;
alter table message_reports enable row level security;

drop policy if exists "own blocks" on blocks;
create policy "own blocks" on blocks for all
  using (blocker_id = auth.uid() or is_admin())
  with check (blocker_id = auth.uid());

drop policy if exists "conversations visible" on conversations;
create policy "conversations visible" on conversations for select
  using (in_conversation(id) or is_admin());

drop policy if exists "start conversation" on conversations;
create policy "start conversation" on conversations for insert
  with check (created_by = auth.uid());

drop policy if exists "participants visible" on conversation_participants;
create policy "participants visible" on conversation_participants for select
  using (in_conversation(conversation_id) or is_admin());

drop policy if exists "manage own participation" on conversation_participants;
create policy "manage own participation" on conversation_participants for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "add participants" on conversation_participants;
create policy "add participants" on conversation_participants for insert
  with check (
    exists (select 1 from conversations c where c.id = conversation_id and c.created_by = auth.uid())
  );

drop policy if exists "messages visible" on messages;
create policy "messages visible" on messages for select
  using (in_conversation(conversation_id) or is_admin());

drop policy if exists "send messages" on messages;
create policy "send messages" on messages for insert
  with check (sender_id = auth.uid() and in_conversation(conversation_id));

drop policy if exists "delete own message" on messages;
create policy "delete own message" on messages for update
  using (sender_id = auth.uid() or is_admin())
  with check (sender_id = auth.uid() or is_admin());

drop policy if exists "file report" on message_reports;
create policy "file report" on message_reports for insert
  with check (reporter_id = auth.uid());

drop policy if exists "read own reports" on message_reports;
create policy "read own reports" on message_reports for select
  using (reporter_id = auth.uid() or is_admin());

drop policy if exists "admin resolves reports" on message_reports;
create policy "admin resolves reports" on message_reports for update
  using (is_admin()) with check (is_admin());
