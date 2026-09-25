alter table public.accounts add column if not exists is_archived boolean not null default false;
alter table public.accounts add column if not exists updated_at timestamptz not null default now();
create index if not exists accounts_user_archived_idx on public.accounts(user_id,is_archived);
