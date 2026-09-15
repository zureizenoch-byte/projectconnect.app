-- 0022_conversation_prompts.sql
-- Two openers and an availability line. A profile should answer "what is this
-- person like to have coffee with", which a CV does not.

alter table profiles
  add column if not exists ask_me_about text,
  add column if not exists looking_for text,
  add column if not exists availability text;
