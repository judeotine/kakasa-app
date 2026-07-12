create table credit_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  score int not null,
  band text not null,
  factors jsonb not null default '[]'::jsonb,
  tips jsonb not null default '[]'::jsonb,
  computed_at timestamptz not null default now()
);
create index idx_credit_scores_user on credit_scores (user_id, computed_at desc);
alter table credit_scores enable row level security;
create policy owner_all on credit_scores for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table loan_providers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  loan_type text not null,
  logo_color text not null,
  min_rate numeric not null,
  max_rate numeric not null,
  max_amount numeric not null,
  min_score int not null,
  min_income numeric not null,
  eligible_employment text[] not null default '{}',
  term_min_months int not null,
  term_max_months int not null,
  requirements text[] not null default '{}',
  description text,
  sort_order int not null default 0
);
alter table loan_providers enable row level security;
create policy read_all on loan_providers for select using (auth.role() = 'authenticated');
