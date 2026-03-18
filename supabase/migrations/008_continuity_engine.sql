-- Migration: Continuity Engine Support
-- Description: Extends daily_logs to track the specific simulated plan day, the user's difficulty rating, and whether it was explicitly skipped.

-- 1. Add plan_day_id
ALTER TABLE public.daily_logs 
ADD COLUMN IF NOT EXISTS plan_day_id uuid REFERENCES public.program_days(id) ON DELETE SET NULL;

-- 2. Add difficulty ('easy', 'perfect', 'hard')
ALTER TABLE public.daily_logs 
ADD COLUMN IF NOT EXISTS difficulty text;

-- 3. Add completed_at (nullable)
ALTER TABLE public.daily_logs 
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

-- 4. Add is_skipped flag
ALTER TABLE public.daily_logs 
ADD COLUMN IF NOT EXISTS is_skipped boolean NOT NULL DEFAULT false;

-- 5. Backfill historical completed_at for existing logs
UPDATE public.daily_logs
SET completed_at = log_date::timestamp
WHERE status = 'completed' AND completed_at IS NULL;

-- Notify postgREST to reload schema
NOTIFY pgrst, 'reload schema';
