-- Demo data mirroring the prototype. Safe to skip for a clean launch.
insert into chapters (name, city, slug) values
  ('Vancouver Chapter', 'Vancouver', 'vancouver'),
  ('Toronto Chapter',   'Toronto',   'toronto')
on conflict (city) do nothing;

insert into venues (chapter_id, name, address, maps_query, capacity, notes)
select c.id, v.name, v.address, v.address, v.capacity, v.notes
from chapters c
join (values
  ('Vancouver', 'Gastown Room',      '300 Water St, Vancouver, BC',        15, 'Private room, step-free access'),
  ('Vancouver', 'Mount Pleasant Loft','2255 Main St, Vancouver, BC',        14, 'Long table, projector'),
  ('Toronto',   'King West Studio',  '620 King St W, Toronto, ON',          15, 'Two rooms, one quiet'),
  ('Toronto',   'Distillery Annex',  '55 Mill St, Toronto, ON',             12, 'Small format, no AV')
) as v(city, name, address, capacity, notes) on v.city = c.city
on conflict do nothing;

-- Events are created by Chapter Leads in the app; these are illustrative.
insert into events (chapter_id, venue_id, kind, title, description, starts_at, seat_cap, status, published_at)
select c.id, vn.id, e.kind::event_kind, e.title, e.description,
       now() + (e.days || ' days')::interval, e.cap, 'published', now()
from chapters c
join venues vn on vn.chapter_id = c.id
join (values
  ('Vancouver', 'Gastown Room',       'meetup', 'Delivery leads roundtable',                        'Six seats per domain, one table.', 12, 14),
  ('Vancouver', 'Mount Pleasant Loft','talk',   'Funding a transformation that has already started','Speaker Series talk.',             18, 12),
  ('Toronto',   'King West Studio',   'meetup', 'Product and QA, same table',                       'Mixed-domain room.',               21, 15)
) as e(city, venue, kind, title, description, days, cap)
  on e.city = c.city and e.venue = vn.name
on conflict do nothing;
