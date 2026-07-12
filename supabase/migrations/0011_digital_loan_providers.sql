-- Replace the placeholder bank/MFI seed with Uganda-licensed digital lenders.
-- Each provider is a digital loan app/brand; its licensed operator is noted in
-- the description.

insert into loan_providers
  (slug, name, loan_type, logo_color, min_rate, max_rate, max_amount, min_score,
   min_income, eligible_employment, term_min_months, term_max_months,
   requirements, description, sort_order)
values
  ('digital-pesa', 'Digital Pesa', 'mobile', '#1E88E5', 12, 24, 1000000, 480, 0,
   '{}'::text[], 1, 3, ARRAY['National ID', 'Mobile money account'],
   'Instant mobile cash loans disbursed in minutes. Licensed by Digital Pesa Holdings Limited.', 1),

  ('mangu-cash', 'Mangu Cash', 'mobile', '#F4511E', 14, 28, 800000, 460, 0,
   '{}'::text[], 1, 2, ARRAY['National ID', 'Phone number'],
   'Quick short-term loans sent straight to your mobile money. Licensed by Volantis Company Limited.', 2),

  ('isente', 'iSente', 'personal', '#00897B', 13, 26, 1200000, 500, 100000,
   '{}'::text[], 1, 3, ARRAY['National ID', 'Mobile money account'],
   'Fast digital loans for everyday needs. Licensed by Volantis Company Limited.', 3),

  ('quick-sente', 'Quick Sente', 'mobile', '#8E24AA', 15, 30, 600000, 440, 0,
   '{}'::text[], 1, 1, ARRAY['National ID'],
   'Emergency cash in minutes, right from your phone. Licensed by Volantis Company Limited.', 4),

  ('fair-credit', 'Fair Credit', 'personal', '#43A047', 10, 20, 1500000, 540, 200000,
   '{}'::text[], 2, 6, ARRAY['National ID', 'Proof of income'],
   'Lower-rate credit that rewards repeat borrowers. Licensed by Volantis Company Limited.', 5),

  ('moji', 'Moji Online Cash Loan', 'mobile', '#FB8C00', 14, 28, 700000, 460, 0,
   '{}'::text[], 1, 2, ARRAY['National ID', 'Mobile money account'],
   'Online cash loans disbursed instantly. Licensed by Punto Point Ltd.', 6),

  ('ozzy-money', 'Ozzy Money', 'mobile', '#3949AB', 15, 29, 500000, 440, 0,
   '{}'::text[], 1, 1, ARRAY['National ID'],
   'Small, fast loans for quick everyday needs. Licensed by Punto Point Ltd.', 7),

  ('flower-loan', 'Flower Loan', 'personal', '#D81B60', 13, 26, 900000, 480, 100000,
   '{}'::text[], 1, 3, ARRAY['National ID', 'Phone number'],
   'Flexible personal loans managed on your phone. Licensed by Punto Point Ltd.', 8),

  ('mumu-money', 'Mumu Money', 'mobile', '#6D4C41', 16, 30, 400000, 420, 0,
   '{}'::text[], 1, 1, ARRAY['National ID'],
   'Micro cash advances available anytime. Licensed by Punto Point Ltd.', 9),

  ('snap-cash', 'Snap Cash', 'mobile', '#00ACC1', 12, 25, 1000000, 500, 100000,
   '{}'::text[], 1, 3, ARRAY['National ID', 'Mobile money account'],
   'Snap up a loan in seconds when you need it. Licensed by Snap Cash Uganda Ltd.', 10),

  ('entebbe-pesa', 'Entebbe Pesa', 'business', '#5E35B1', 13, 27, 1200000, 500, 150000,
   '{}'::text[], 1, 4, ARRAY['National ID', 'Proof of income'],
   'Digital loans for work and small business. Licensed by Entebbe Pesa Ltd.', 11),

  ('okane', 'Okane Cash', 'business', '#C0CA33', 14, 28, 800000, 470, 0,
   '{}'::text[], 1, 2, ARRAY['National ID', 'Mobile money account'],
   'Online cash loans on demand. Licensed by Okane Financial Solutions Ltd.', 12),

  ('troncash', 'TronCash', 'mobile', '#455A64', 15, 29, 600000, 450, 0,
   '{}'::text[], 1, 2, ARRAY['National ID', 'Phone number'],
   'Instant digital loans, anytime you need them. Licensed by TronCash App.', 13),

  ('senteyo', 'Senteyo', 'personal', '#4C2311', 12, 24, 1000000, 500, 100000,
   '{}'::text[], 1, 3, ARRAY['National ID', 'Mobile money account'],
   'Simple mobile loans that grow with your credit. Licensed by Senteyo App.', 14)

on conflict (slug) do update set
  name = excluded.name,
  loan_type = excluded.loan_type,
  logo_color = excluded.logo_color,
  min_rate = excluded.min_rate,
  max_rate = excluded.max_rate,
  max_amount = excluded.max_amount,
  min_score = excluded.min_score,
  min_income = excluded.min_income,
  eligible_employment = excluded.eligible_employment,
  term_min_months = excluded.term_min_months,
  term_max_months = excluded.term_max_months,
  requirements = excluded.requirements,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- Repoint any existing applications that referenced the old (removed) providers
-- so the delete below does not violate the foreign key.
update loan_applications
set provider_id = (select id from loan_providers where slug = 'snap-cash')
where provider_id not in (
  select id from loan_providers
  where slug in (
    'digital-pesa', 'mangu-cash', 'isente', 'quick-sente', 'fair-credit',
    'moji', 'ozzy-money', 'flower-loan', 'mumu-money', 'snap-cash',
    'entebbe-pesa', 'okane', 'troncash', 'senteyo'
  )
);

-- Remove the old bank/MFI seed providers.
delete from loan_providers
where slug not in (
  'digital-pesa', 'mangu-cash', 'isente', 'quick-sente', 'fair-credit',
  'moji', 'ozzy-money', 'flower-loan', 'mumu-money', 'snap-cash',
  'entebbe-pesa', 'okane', 'troncash', 'senteyo'
);
