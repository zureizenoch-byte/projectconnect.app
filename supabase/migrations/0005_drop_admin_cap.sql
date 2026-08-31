-- 0005_drop_admin_cap.sql
-- No hard cap on admin accounts; who holds the role is an operational decision.
drop trigger if exists admin_cap on role_grants;
drop function if exists enforce_admin_cap();
