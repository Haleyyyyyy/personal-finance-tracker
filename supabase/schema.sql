create extension if not exists "pgcrypto";
create table if not exists categories(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users not null,name text not null,type text not null check(type in('income','expense','transfer')),created_at timestamptz default now());
create table if not exists accounts(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users not null,name text not null,institution text,currency text default 'CNY',account_type text,balance numeric(18,2) default 0,created_at timestamptz default now());
create table if not exists statements(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users not null,account_id uuid references accounts(id),file_name text not null,storage_path text,status text default 'uploaded',period_start date,period_end date,created_at timestamptz default now());
create table if not exists transactions(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users not null,account_id uuid references accounts(id),statement_id uuid references statements(id) on delete cascade,category_id uuid references categories(id),transaction_date date not null,description text not null,amount numeric(18,2) not null,direction text not null check(direction in('income','expense','transfer')),status text default 'review',fingerprint text,raw_data jsonb default '{}'::jsonb,created_at timestamptz default now());
create table if not exists budgets(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade not null,month date not null,category text not null,amount numeric(18,2) not null check(amount>0),color text not null default '#1f6b52',created_at timestamptz default now(),updated_at timestamptz default now(),unique(user_id,month,category));
create unique index if not exists transactions_user_fingerprint on transactions(user_id,fingerprint) where fingerprint is not null;
alter table categories enable row level security;alter table accounts enable row level security;alter table statements enable row level security;alter table transactions enable row level security;
alter table budgets enable row level security;
create policy "own categories" on categories for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "own accounts" on accounts for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "own statements" on statements for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "own transactions" on transactions for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "own budgets" on budgets for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
insert into storage.buckets(id,name,public) values('statements','statements',false) on conflict(id) do nothing;
create policy "own statement files" on storage.objects for all to authenticated using(bucket_id='statements' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='statements' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Structured transaction classification, hierarchical expense categories, and normalized tags.
-- See supabase/migrations/20260925090000_structured_transaction_classification.sql for the complete seed and backfill.
alter table categories add column if not exists key text;
alter table categories add column if not exists parent_id uuid references categories(id) on delete cascade;
alter table categories add column if not exists system boolean not null default false;
alter table categories add column if not exists updated_at timestamptz not null default now();
alter table transactions add column if not exists transaction_type text check(transaction_type in('income','expense','transfer','card_repayment','investment','fx','cash','interest','review'));
alter table transactions add column if not exists subcategory_id uuid references categories(id) on delete set null;
alter table transactions add column if not exists classification_status text check(classification_status in('confirmed','review'));
alter table transactions add column if not exists classification_confidence numeric(4,3);
create table if not exists tags(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,name text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists transaction_tags(transaction_id uuid not null references transactions(id) on delete cascade,tag_id uuid not null references tags(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(transaction_id,tag_id));
alter table tags enable row level security;alter table transaction_tags enable row level security;
