-- User-authored transaction notes are independent from immutable bank source data.
alter table public.transactions
  add column if not exists note text;

alter table public.transactions
  drop constraint if exists transactions_note_length_check;

alter table public.transactions
  add constraint transactions_note_length_check
  check (note is null or char_length(note) <= 1000);

comment on column public.transactions.note is
  'Private user-authored note. Import, parsing, classification and fingerprinting must not modify this field.';
