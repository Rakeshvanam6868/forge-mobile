-- create tables
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  goal text,
  level text,
  environment text,
  diet_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  day_number int not null,
  workout_text text,
  meal_text text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.daily_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null,
  workout_done boolean default false,
  diet_done boolean default false,
  energy_level int check (energy_level >= 1 and energy_level <= 3),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

-- set up row level security (RLS)
alter table public.users enable row level security;
alter table public.plans enable row level security;
alter table public.daily_logs enable row level security;

-- policies
create policy "Users can view own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

create policy "Users can view own plans" on public.plans for select using (auth.uid() = user_id);
create policy "Users can insert own plans" on public.plans for insert with check (auth.uid() = user_id);

create policy "Users can view own logs" on public.daily_logs for select using (auth.uid() = user_id);
create policy "Users can insert own logs" on public.daily_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own logs" on public.daily_logs for update using (auth.uid() = user_id);
