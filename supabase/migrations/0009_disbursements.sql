create table disbursements (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references loan_applications(id) on delete cascade not null,
  loan_id uuid references loans(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric not null,
  phone_number text not null,
  provider text not null default 'mobile_money',
  status text check (status in ('pending', 'processing', 'completed', 'failed')) not null default 'pending',
  transaction_ref text,
  failure_reason text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_disbursements_user on disbursements (user_id, created_at desc);
create index idx_disbursements_application on disbursements (application_id);

alter table disbursements enable row level security;
create policy users_own_disbursements on disbursements
  for select using (auth.uid() = user_id);

alter table loan_applications
  add column if not exists disbursement_id uuid references disbursements(id),
  add column if not exists disbursement_phone text;
