create table if not exists public.book_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  books jsonb not null default '[]'::jsonb,
  active_book_id text,
  updated_at timestamptz not null default now()
);

alter table public.book_logs enable row level security;

create policy "Users can read their own book log"
  on public.book_logs for select
  using (auth.uid() = user_id);

create policy "Users can create their own book log"
  on public.book_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own book log"
  on public.book_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own book log"
  on public.book_logs for delete
  using (auth.uid() = user_id);
