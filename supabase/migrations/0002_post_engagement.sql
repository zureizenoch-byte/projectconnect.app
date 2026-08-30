-- Likes and comments on feed posts
create table if not exists post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on post_comments (post_id, created_at);

alter table post_likes enable row level security;
alter table post_comments enable row level security;

drop policy if exists "likes readable" on post_likes;
create policy "likes readable" on post_likes for select using (auth.uid() is not null);
drop policy if exists "own likes write" on post_likes;
create policy "own likes write" on post_likes for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "comments readable" on post_comments;
create policy "comments readable" on post_comments for select using (auth.uid() is not null);
drop policy if exists "own comments write" on post_comments;
create policy "own comments write" on post_comments for all
  using (author_id = auth.uid() or is_admin()) with check (author_id = auth.uid() or is_admin());
