-- 0023_report_outcomes.sql
-- A resolved report should say what was decided, and why.

alter table message_reports
  add column if not exists upheld boolean not null default false,
  add column if not exists resolution_note text;

alter table post_reports
  add column if not exists upheld boolean not null default false,
  add column if not exists resolution_note text;
