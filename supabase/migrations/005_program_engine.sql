-- Phase 4: Program Engine Tables
-- 6 new tables for structured program content

-- 1. Programs (one per user)
create table public.programs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  goal text not null,
  level text not null,
  location text not null,
  diet_type text not null,
  duration_weeks int not null default 4,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Program Weeks
create table public.program_weeks (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid references public.programs(id) on delete cascade not null,
  week_number int not null check (week_number >= 1 and week_number <= 4)
);

-- 3. Program Days
create table public.program_days (
  id uuid primary key default uuid_generate_v4(),
  program_week_id uuid references public.program_weeks(id) on delete cascade not null,
  day_number int not null check (day_number >= 1 and day_number <= 7),
  title text not null,
  focus_type text not null check (focus_type in ('strength', 'cardio', 'mobility', 'rest'))
);

-- 4. Day Workouts
create table public.day_workouts (
  id uuid primary key default uuid_generate_v4(),
  program_day_id uuid references public.program_days(id) on delete cascade not null,
  exercise_name text not null,
  sets int,
  reps text,
  duration text,
  video_url text,
  order_index int not null default 0
);

-- 5. Day Meals
create table public.day_meals (
  id uuid primary key default uuid_generate_v4(),
  program_day_id uuid references public.program_days(id) on delete cascade not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'snack', 'dinner')),
  title text not null,
  description text
);

-- 6. Week Groceries
create table public.week_groceries (
  id uuid primary key default uuid_generate_v4(),
  program_week_id uuid references public.program_weeks(id) on delete cascade not null,
  category text not null check (category in ('protein', 'carbs', 'vegetables', 'essentials')),
  item_name text not null
);

-- RLS
alter table public.programs enable row level security;
alter table public.program_weeks enable row level security;
alter table public.program_days enable row level security;
alter table public.day_workouts enable row level security;
alter table public.day_meals enable row level security;
alter table public.week_groceries enable row level security;

-- Programs policies
create policy "Users can view own programs" on public.programs for select using (auth.uid() = user_id);
create policy "Users can insert own programs" on public.programs for insert with check (auth.uid() = user_id);

-- Program weeks: join through programs
create policy "Users can view own program_weeks" on public.program_weeks for select
  using (exists (select 1 from public.programs where programs.id = program_weeks.program_id and programs.user_id = auth.uid()));
create policy "Users can insert own program_weeks" on public.program_weeks for insert
  with check (exists (select 1 from public.programs where programs.id = program_weeks.program_id and programs.user_id = auth.uid()));

-- Program days: join through weeks → programs
create policy "Users can view own program_days" on public.program_days for select
  using (exists (
    select 1 from public.program_weeks pw
    join public.programs p on p.id = pw.program_id
    where pw.id = program_days.program_week_id and p.user_id = auth.uid()
  ));
create policy "Users can insert own program_days" on public.program_days for insert
  with check (exists (
    select 1 from public.program_weeks pw
    join public.programs p on p.id = pw.program_id
    where pw.id = program_days.program_week_id and p.user_id = auth.uid()
  ));

-- Day workouts
create policy "Users can view own day_workouts" on public.day_workouts for select
  using (exists (
    select 1 from public.program_days pd
    join public.program_weeks pw on pw.id = pd.program_week_id
    join public.programs p on p.id = pw.program_id
    where pd.id = day_workouts.program_day_id and p.user_id = auth.uid()
  ));
create policy "Users can insert own day_workouts" on public.day_workouts for insert
  with check (exists (
    select 1 from public.program_days pd
    join public.program_weeks pw on pw.id = pd.program_week_id
    join public.programs p on p.id = pw.program_id
    where pd.id = day_workouts.program_day_id and p.user_id = auth.uid()
  ));

-- Day meals
create policy "Users can view own day_meals" on public.day_meals for select
  using (exists (
    select 1 from public.program_days pd
    join public.program_weeks pw on pw.id = pd.program_week_id
    join public.programs p on p.id = pw.program_id
    where pd.id = day_meals.program_day_id and p.user_id = auth.uid()
  ));
create policy "Users can insert own day_meals" on public.day_meals for insert
  with check (exists (
    select 1 from public.program_days pd
    join public.program_weeks pw on pw.id = pd.program_week_id
    join public.programs p on p.id = pw.program_id
    where pd.id = day_meals.program_day_id and p.user_id = auth.uid()
  ));

-- Week groceries
create policy "Users can view own week_groceries" on public.week_groceries for select
  using (exists (
    select 1 from public.program_weeks pw
    join public.programs p on p.id = pw.program_id
    where pw.id = week_groceries.program_week_id and p.user_id = auth.uid()
  ));
create policy "Users can insert own week_groceries" on public.week_groceries for insert
  with check (exists (
    select 1 from public.program_weeks pw
    join public.programs p on p.id = pw.program_id
    where pw.id = week_groceries.program_week_id and p.user_id = auth.uid()
  ));
