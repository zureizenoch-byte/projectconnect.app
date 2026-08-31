-- 0006_applicant_can_amend.sql
-- Applicants may edit or withdraw their own request while it is still pending.
-- Decided requests stay locked, and only admins can change status.

drop policy if exists "amend own pending request" on access_requests;
create policy "amend own pending request" on access_requests for update
  using (profile_id = auth.uid() and status = 'pending')
  with check (profile_id = auth.uid() and status = 'pending');

drop policy if exists "withdraw own pending request" on access_requests;
create policy "withdraw own pending request" on access_requests for delete
  using (profile_id = auth.uid() and status = 'pending');
