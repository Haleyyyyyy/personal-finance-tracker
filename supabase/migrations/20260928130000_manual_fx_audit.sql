-- Audit user FX overrides without changing immutable statement values.
alter table public.transactions
  add column if not exists exchange_rate_updated_at timestamptz,
  add column if not exists exchange_rate_updated_by uuid references auth.users(id) on delete set null;

comment on column public.transactions.exchange_rate_updated_at is
  'When the current automatic or manual exchange rate was last explicitly saved.';
comment on column public.transactions.exchange_rate_updated_by is
  'Authenticated user who explicitly saved the current exchange rate.';
