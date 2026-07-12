alter table loan_applications
  add column if not exists applicant_details jsonb not null default '{}'::jsonb,
  add column if not exists consent_accepted_at timestamptz,
  add column if not exists liveness_completed boolean not null default false,
  add column if not exists id_submitted boolean not null default false;

insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do nothing;

drop policy if exists "own kyc read" on storage.objects;
drop policy if exists "own kyc write" on storage.objects;

create policy "own kyc read" on storage.objects for select
  using (bucket_id = 'application-documents' and (storage.foldername(name))[2] = auth.uid()::text);
create policy "own kyc write" on storage.objects for insert
  with check (bucket_id = 'application-documents' and (storage.foldername(name))[2] = auth.uid()::text);
