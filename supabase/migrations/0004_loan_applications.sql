create table loan_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider_id uuid references loan_providers(id) not null,
  status text check (status in (
    'credit_check', 'consent', 'interviewing', 'reviewing',
    'approved', 'declined', 'cancelled'
  )) not null default 'credit_check',
  credit_score int,
  risk_level text,
  risk_probability numeric,
  amount_requested numeric,
  term_months int,
  interview_transcript jsonb not null default '[]'::jsonb,
  interview_score numeric,
  interview_flags jsonb not null default '[]'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  decision_reasons jsonb not null default '[]'::jsonb,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_loan_applications_user on loan_applications (user_id, created_at desc);
create index idx_loan_applications_status on loan_applications (status);

alter table loan_applications enable row level security;
create policy owner_all on loan_applications
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references loan_applications(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  doc_type text not null,
  file_name text not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

create index idx_app_docs_application on application_documents (application_id);

alter table application_documents enable row level security;
create policy owner_all on application_documents
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
