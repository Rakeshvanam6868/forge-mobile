-- Restructure daily_logs to match the new calendar-based consistency engine.
-- Old columns: date, workout_done (bool), diet_done (bool), energy_level (int)
-- New columns: log_date (date), status (text), energy (text)

-- Step 1: Drop old unique constraint
alter table public.daily_logs drop constraint if exists daily_logs_user_id_date_key;

-- Step 2: Add new columns
alter table public.daily_logs add column log_date date;
alter table public.daily_logs add column status text;
alter table public.daily_logs add column energy text;

-- Step 3: Migrate existing data
update public.daily_logs set
  log_date = date,
  status = case when workout_done = true then 'completed' else 'skipped' end,
  energy = case
    when energy_level = 1 then 'low'
    when energy_level = 2 then 'medium'
    when energy_level = 3 then 'high'
    else 'medium'
  end;

-- Step 4: Make log_date NOT NULL after backfill
alter table public.daily_logs alter column log_date set not null;
alter table public.daily_logs alter column status set not null;

-- Step 5: Add new unique constraint
alter table public.daily_logs add constraint daily_logs_user_id_log_date_key unique(user_id, log_date);

-- Step 6: Drop old columns (optional — keep if you want backward compat)
alter table public.daily_logs drop column if exists date;
alter table public.daily_logs drop column if exists workout_done;
alter table public.daily_logs drop column if exists diet_done;
alter table public.daily_logs drop column if exists energy_level;
