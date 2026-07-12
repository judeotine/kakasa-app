drop policy if exists owner_all on loan_applications;

create policy app_select on loan_applications
  for select using (auth.uid() = user_id);

create policy app_insert on loan_applications
  for insert with check (
    auth.uid() = user_id
    and status = 'credit_check'
    and interview_score is null
    and decision_reasons = '[]'::jsonb
    and decided_at is null
  );

create policy app_update on loan_applications
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and status in ('consent', 'interviewing', 'cancelled')
    and interview_score is null
    and decision_reasons = '[]'::jsonb
    and decided_at is null
  );
