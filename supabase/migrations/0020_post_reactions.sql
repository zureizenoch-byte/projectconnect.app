-- 0020_post_reactions.sql
-- One reaction per person per post. An existing like becomes a thumbs up, so
-- nothing already given is lost.

alter table post_likes add column if not exists reaction text not null default 'like';

alter table post_likes drop constraint if exists post_likes_reaction_check;
alter table post_likes add constraint post_likes_reaction_check
  check (reaction in ('like','love','yes','laugh','idea','oof'));

create index if not exists post_likes_tally_idx on post_likes (post_id, reaction);
