-- 0013_venue_contact_discovery.sql
alter table venues
  add column if not exists website text,
  add column if not exists phone text,
  add column if not exists place_id text;
