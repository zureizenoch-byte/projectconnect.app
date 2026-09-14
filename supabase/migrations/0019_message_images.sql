-- 0019_message_images.sql
alter table messages add column if not exists image_url text;

-- a message may be a photograph with no words
alter table messages drop constraint if exists messages_body_check;
alter table messages add constraint messages_body_check
  check (char_length(body) <= 4000 and (char_length(body) > 0 or image_url is not null));

insert into storage.buckets (id, name, public)
values ('message-images', 'message-images', true)
on conflict (id) do update set public = true;

drop policy if exists "message images are readable" on storage.objects;
create policy "message images are readable" on storage.objects
  for select using (bucket_id = 'message-images');
