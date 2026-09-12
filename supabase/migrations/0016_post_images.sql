-- 0016_post_images.sql
-- Photographs on feed posts.

alter table posts add column if not exists image_url text;

-- a post may now be a photograph with no words
alter table posts drop constraint if exists posts_body_check;
alter table posts add constraint posts_body_check
  check (char_length(body) <= 4000 and (char_length(body) > 0 or image_url is not null));

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set public = true;

drop policy if exists "post images are publicly readable" on storage.objects;
create policy "post images are publicly readable" on storage.objects
  for select using (bucket_id = 'post-images');

drop policy if exists "members upload their own post images" on storage.objects;
create policy "members upload their own post images" on storage.objects
  for insert with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
