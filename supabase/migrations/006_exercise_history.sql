-- Phase 5: Exercise History Table
-- Tracks per-exercise performance for adaptive programming

create table public.exercise_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  exercise_id text not null,
  last_sets int,
  last_reps int,
  last_weight float,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  performed_at date not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, exercise_id)
);

-- Index for fast lookup
create index idx_exercise_history_user on public.exercise_history(user_id);

-- RLS
alter table public.exercise_history enable row level security;

create policy "Users can view own exercise_history" on public.exercise_history
  for select using (auth.uid() = user_id);

create policy "Users can insert own exercise_history" on public.exercise_history
  for insert with check (auth.uid() = user_id);

create policy "Users can update own exercise_history" on public.exercise_history
  for update using (auth.uid() = user_id);
