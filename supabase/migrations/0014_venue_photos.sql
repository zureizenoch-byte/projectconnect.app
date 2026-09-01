-- 0014_venue_photos.sql
alter table venues add column if not exists photo_url text;
