create table loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,
  provider_type text,
  principal numeric not null,
  interest_rate numeric not null,
  term_months int not null,
  total_repayable numeric not null,
  amount_paid numeric not null default 0,
  disbursed_at date not null,
  due_date date not null,
  status text check (status in ('active','paid','overdue','pending')) not null default 'active',
  created_at timestamptz default now()
);

create table loan_payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references loans(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric not null,
  method text,
  paid_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create index idx_loans_user on loans (user_id, disbursed_at desc);
create index idx_loan_payments_user on loan_payments (user_id, paid_at desc);
create index idx_loan_payments_loan on loan_payments (loan_id, paid_at);

alter table loans enable row level security;
alter table loan_payments enable row level security;
create policy owner_all on loans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_all on loan_payments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
