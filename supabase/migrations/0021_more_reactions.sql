-- 0021_more_reactions.sql
-- The extended reaction set behind the + on the reaction bar.

alter table post_likes drop constraint if exists post_likes_reaction_check;
alter table post_likes add constraint post_likes_reaction_check
  check (reaction in (
    'like','love','yes','laugh','idea','oof',
    'clap','fire','hundred','party','thanks','strong','star','rocket','eyes',
    'think','sad','wow','coffee','agree','brain','target','chart','salute'
  ));
