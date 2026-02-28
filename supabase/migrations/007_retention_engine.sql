-- Phase 6: Retention Engine — Event Tracking
-- Tracks user behavior for retention analytics

create table public.user_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  event_type text not null check (event_type in (
    'APP_OPEN', 'DAY_VIEWED', 'DAY_COMPLETED',
    'STREAK_BROKEN', 'PROGRAM_STARTED'
  )),
  event_date date not null default current_date,
  event_meta jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- DB-level dedup: one event per type per user per calendar day
  unique(user_id, event_type, event_date)
);

-- Indexes for analytics queries
create index idx_user_events_user_type on public.user_events(user_id, event_type);
create index idx_user_events_date on public.user_events(event_date);

-- RLS
alter table public.user_events enable row level security;

create policy "Users can view own events" on public.user_events
  for select using (auth.uid() = user_id);

create policy "Users can insert own events" on public.user_events
  for insert with check (auth.uid() = user_id);
