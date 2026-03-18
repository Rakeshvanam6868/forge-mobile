-- Migration: Add exercise_id and rest_sec to day_workouts
-- This ensures planned workouts are linked to the exercise pool and have rest timing.

-- 1. Add columns to day_workouts
ALTER TABLE public.day_workouts 
ADD COLUMN IF NOT EXISTS exercise_id text,
ADD COLUMN IF NOT EXISTS rest_sec integer DEFAULT 60;

-- 2. Update existing rows if possible (finding by name)
-- Note: This is an best-effort backfill for existing users.
-- Mapping some common ones using the new plural ID standard...
UPDATE public.day_workouts SET exercise_id = 'ex-push-ups' WHERE exercise_name ILIKE '%push-up%' AND exercise_id IS NULL;
UPDATE public.day_workouts SET exercise_id = 'ex-db-bench-press' WHERE exercise_name ILIKE '%bench press%' AND exercise_id IS NULL;
UPDATE public.day_workouts SET exercise_id = 'ex-bb-squat' WHERE exercise_name ILIKE 'squat' AND exercise_id IS NULL;
UPDATE public.day_workouts SET exercise_id = 'ex-plank' WHERE exercise_name ILIKE '%plank%' AND exercise_id IS NULL;
UPDATE public.day_workouts SET exercise_id = 'ex-cat-cow' WHERE exercise_name ILIKE '%cat-cow%' AND exercise_id IS NULL;

-- 3. Add foreign key constraint (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'day_workouts_exercise_id_fkey'
    ) THEN
        ALTER TABLE public.day_workouts 
        ADD CONSTRAINT day_workouts_exercise_id_fkey 
        FOREIGN KEY (exercise_id) 
        REFERENCES public.exercise_details(id);
    END IF;
END $$;
