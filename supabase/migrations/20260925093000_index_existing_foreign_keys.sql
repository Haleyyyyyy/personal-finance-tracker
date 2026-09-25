create index if not exists accounts_user_id_idx on public.accounts(user_id);
create index if not exists statements_account_id_idx on public.statements(account_id);
create index if not exists statements_user_id_idx on public.statements(user_id);
create index if not exists transactions_account_id_idx on public.transactions(account_id);
create index if not exists transactions_statement_id_idx on public.transactions(statement_id);
