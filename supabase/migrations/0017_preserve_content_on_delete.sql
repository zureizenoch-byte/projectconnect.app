-- 0017_preserve_content_on_delete.sql
-- Deleting an account removes the person, not the conversation.
--
-- Posts and comments survive with a null author, so threads other members
-- took part in stay readable. The name and photo go with the profile.

-- posts
alter table posts drop constraint if exists posts_author_id_fkey;
alter table posts alter column author_id drop not null;
alter table posts add constraint posts_author_id_fkey
  foreign key (author_id) references profiles(id) on delete set null;

-- comments
alter table post_comments drop constraint if exists post_comments_author_id_fkey;
alter table post_comments alter column author_id drop not null;
alter table post_comments add constraint post_comments_author_id_fkey
  foreign key (author_id) references profiles(id) on delete set null;

-- likes are a tally, not content: they leave with the person
-- (post_likes keeps its cascade)

-- reports stay for the audit trail, minus the reporter
alter table post_reports drop constraint if exists post_reports_reporter_id_fkey;
alter table post_reports alter column reporter_id drop not null;
alter table post_reports add constraint post_reports_reporter_id_fkey
  foreign key (reporter_id) references profiles(id) on delete set null;

-- events keep their history; a deleted organiser simply has no profile
alter table events drop constraint if exists events_host_id_fkey;
alter table events add constraint events_host_id_fkey
  foreign key (host_id) references profiles(id) on delete set null;

alter table events drop constraint if exists events_created_by_fkey;
alter table events add constraint events_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

-- a post with no author must still be readable
drop policy if exists "posts readable" on posts;
create policy "posts readable" on posts for select using (auth.uid() is not null);
