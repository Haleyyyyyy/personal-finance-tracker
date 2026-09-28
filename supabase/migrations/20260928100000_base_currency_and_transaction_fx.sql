create table if not exists public.user_settings(
 user_id uuid primary key references auth.users(id) on delete cascade,
 base_currency text not null default 'CNY' check(base_currency in('CNY','HKD','USD','EUR','JPY','AUD','SGD')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
drop policy if exists "own settings" on public.user_settings;
create policy "own settings" on public.user_settings for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
grant select,insert,update,delete on public.user_settings to authenticated;

alter table public.transactions add column if not exists original_amount numeric(18,6);
alter table public.transactions add column if not exists original_currency text;
alter table public.transactions add column if not exists base_amount numeric(18,6);
alter table public.transactions add column if not exists base_currency text;
alter table public.transactions add column if not exists exchange_rate numeric(20,10);
alter table public.transactions add column if not exists exchange_rate_date date;
alter table public.transactions add column if not exists exchange_rate_source text;
alter table public.transactions add column if not exists conversion_status text;
alter table public.transactions drop constraint if exists transactions_conversion_status_check;
alter table public.transactions add constraint transactions_conversion_status_check check(conversion_status in('converted','pending'));
create index if not exists transactions_user_conversion_status_idx on public.transactions(user_id,conversion_status);

insert into public.user_settings(user_id,base_currency)
select id,'CNY' from auth.users on conflict(user_id) do nothing;

update public.transactions t set
 original_amount=coalesce(t.original_amount,t.amount),
 original_currency=coalesce(t.original_currency,nullif(t.raw_data->>'currency',''),a.currency,'CNY'),
 base_currency=coalesce(t.base_currency,'CNY')
from public.accounts a
where a.id=t.account_id and (t.original_amount is null or t.original_currency is null or t.base_currency is null);
update public.transactions set
 original_amount=coalesce(original_amount,amount),
 original_currency=coalesce(original_currency,nullif(raw_data->>'currency',''),'CNY'),
 base_currency=coalesce(base_currency,'CNY');
update public.transactions set base_amount=original_amount,exchange_rate=1,exchange_rate_date=transaction_date,exchange_rate_source='base_currency',conversion_status='converted'
where original_currency=base_currency;
update public.transactions set base_amount=null,exchange_rate=null,exchange_rate_date=null,exchange_rate_source=null,conversion_status='pending'
where original_currency<>base_currency and conversion_status is distinct from 'converted';
