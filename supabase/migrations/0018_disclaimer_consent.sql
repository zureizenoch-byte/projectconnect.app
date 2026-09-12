-- 0018_disclaimer_consent.sql
-- The member disclaimer is a third document members acknowledge at signup.
alter type consent_doc add value if not exists 'disclaimer';
