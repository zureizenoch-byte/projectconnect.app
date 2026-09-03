-- 0016_speaker_not_an_attendee.sql
-- A Speaker Series speaker presents to the room, so the seat cap is the
-- audience. Release any seat a speaker holds on their own talk.
delete from event_seats s
using events e
where e.id = s.event_id
  and e.kind = 'talk'
  and s.profile_id = coalesce(e.host_id, e.created_by);
