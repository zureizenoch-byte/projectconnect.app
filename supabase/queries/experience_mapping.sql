-- ============================================================================
-- Experience mapping — the data members give you, in a form you can read.
--
-- Run any block on its own in Supabase → SQL Editor. Every one of these can be
-- exported straight to CSV from the results pane (Download CSV).
--
-- "Transformation mapping" is stored as tagged rows in profile_tags, one row
-- per value per person, under these categories:
--   domain · transformation_type · method · industry
--   certification · tool · language · topic
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. One row per member, every category collapsed into columns.
--    This is the export to hand anyone who asks for "the mapping data".
-- ----------------------------------------------------------------------------
select
  p.full_name,
  p.email,
  p.role,
  p.city                                          as chapter,
  p.role_level,
  p.employer,
  p.years_experience,
  p.budget_owned,
  coalesce(s.tier::text, 'free')                  as plan,
  string_agg(distinct t.value, ', ') filter (where t.category = 'domain')              as domains,
  string_agg(distinct t.value, ', ') filter (where t.category = 'transformation_type') as transformation_types,
  string_agg(distinct t.value, ', ') filter (where t.category = 'method')              as methods,
  string_agg(distinct t.value, ', ') filter (where t.category = 'industry')            as industries,
  string_agg(distinct t.value, ', ') filter (where t.category = 'certification')       as certifications,
  string_agg(distinct t.value, ', ') filter (where t.category = 'tool')                as tools,
  string_agg(distinct t.value, ', ') filter (where t.category = 'language')            as languages,
  string_agg(distinct t.value, ', ') filter (where t.category = 'topic')               as speaking_topics,
  count(t.id)                                     as total_tags,
  p.created_at::date                              as joined
from profiles p
left join profile_tags t on t.profile_id = p.id
left join subscriptions s on s.profile_id = p.id
group by p.id, p.full_name, p.email, p.role, p.city, p.role_level,
         p.employer, p.years_experience, p.budget_owned, s.tier, p.created_at
order by p.created_at desc;


-- ----------------------------------------------------------------------------
-- 2. What the community actually knows: every value, ranked by how many
--    members claim it. This is the one worth looking at before planning a
--    speaker series or a chapter's next few meetups.
-- ----------------------------------------------------------------------------
select
  category,
  value,
  count(*)                                        as members,
  round(100.0 * count(*) / nullif(
    (select count(*) from profiles where role <> 'admin'), 0), 1)   as pct_of_members,
  count(*) filter (where is_custom)                as write_ins
from profile_tags
group by category, value
order by category, members desc, value;


-- ----------------------------------------------------------------------------
-- 3. Write-ins: what people typed under "Other, please specify".
--    These are your candidates for promotion into the standing option lists.
-- ----------------------------------------------------------------------------
select
  category,
  value,
  count(*)                                        as times_entered,
  string_agg(p.full_name, ', ')                   as who
from profile_tags t
join profiles p on p.id = t.profile_id
where t.is_custom
group by category, value
order by times_entered desc, category, value;


-- ----------------------------------------------------------------------------
-- 4. Coverage: who has mapped their experience and who has not.
--    An unmapped member cannot be matched well, so this is the list to chase.
-- ----------------------------------------------------------------------------
select
  p.full_name,
  p.email,
  p.city                                          as chapter,
  count(distinct t.category)                      as categories_filled,
  round(100.0 * count(distinct t.category) / 8.0) as pct_complete,
  case
    when count(t.id) = 0 then 'Nothing mapped'
    when count(distinct t.category) <= 2 then 'Barely started'
    when count(distinct t.category) <= 5 then 'Partly mapped'
    else 'Well mapped'
  end                                             as standing,
  p.created_at::date                              as joined
from profiles p
left join profile_tags t on t.profile_id = p.id
group by p.id, p.full_name, p.email, p.city, p.created_at
order by categories_filled asc, p.created_at desc;


-- ----------------------------------------------------------------------------
-- 5. Domain by seniority — the shape of a room before you seat it.
-- ----------------------------------------------------------------------------
select
  t.value                                         as domain,
  count(*) filter (where p.role_level = 'Student')        as students,
  count(*) filter (where p.role_level = 'Analyst')        as analysts,
  count(*) filter (where p.role_level = 'Manager')        as managers,
  count(*) filter (where p.role_level = 'Senior Manager') as senior_managers,
  count(*) filter (where p.role_level = 'Director')       as directors,
  count(*) filter (where p.role_level = 'Executive')      as executives,
  count(*)                                        as total
from profile_tags t
join profiles p on p.id = t.profile_id
where t.category = 'domain'
group by t.value
order by total desc;


-- ----------------------------------------------------------------------------
-- 6. Per chapter: the ten most common values in each category.
--    Change the city to look at the other chapter.
-- ----------------------------------------------------------------------------
with ranked as (
  select
    t.category,
    t.value,
    count(*)                                      as members,
    row_number() over (partition by t.category order by count(*) desc) as rank
  from profile_tags t
  join profiles p on p.id = t.profile_id
  where p.city = 'Vancouver'          -- ← change chapter here
  group by t.category, t.value
)
select category, value, members
from ranked
where rank <= 10
order by category, members desc;


-- ----------------------------------------------------------------------------
-- 7. Who matches a given profile — the query behind "find me someone who has
--    done this". Edit the two values and run.
-- ----------------------------------------------------------------------------
select
  p.full_name,
  p.email,
  p.role_level,
  p.employer,
  p.city                                          as chapter,
  p.years_experience,
  p.intro
from profiles p
where exists (
    select 1 from profile_tags t
    where t.profile_id = p.id
      and t.category = 'domain'
      and t.value = 'Delivery Management'          -- ← domain
  )
  and exists (
    select 1 from profile_tags t
    where t.profile_id = p.id
      and t.category = 'industry'
      and t.value = 'Banking'                      -- ← industry
  )
order by p.years_experience desc nulls last;


-- ----------------------------------------------------------------------------
-- 8. Speaker pool with their stated topics — what you can actually programme.
-- ----------------------------------------------------------------------------
select
  p.full_name,
  p.email,
  p.role_level,
  p.employer,
  p.city                                          as chapter,
  string_agg(distinct t.value, ', ') filter (where t.category = 'topic')  as topics,
  string_agg(distinct t.value, ', ') filter (where t.category = 'domain') as domains,
  (select count(*) from events e
   where e.host_id = p.id and e.kind = 'talk' and e.status <> 'cancelled') as talks_scheduled
from profiles p
left join profile_tags t on t.profile_id = p.id
where p.role = 'speaker' and p.speaker_approved
group by p.id, p.full_name, p.email, p.role_level, p.employer, p.city
order by p.full_name;


-- ----------------------------------------------------------------------------
-- 9. Raw rows, unaggregated — for a spreadsheet or a reporting tool that
--    would rather do its own grouping.
-- ----------------------------------------------------------------------------
select
  p.full_name,
  p.email,
  p.city            as chapter,
  p.role_level,
  t.category,
  t.value,
  t.is_custom       as was_a_write_in
from profile_tags t
join profiles p on p.id = t.profile_id
order by p.full_name, t.category, t.value;
