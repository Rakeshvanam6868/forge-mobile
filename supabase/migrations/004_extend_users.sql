-- Migration: Extend users for adaptive engine connection
-- Description: Adds fields needed for adaptive program generation and structural onboarding gating, without destroying existing rows.

-- 1. Add weekly_frequency column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS weekly_frequency text NOT NULL DEFAULT '3-4';

-- 2. Add last_workout_type column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_workout_type text NOT NULL DEFAULT 'none';

-- 3. Add onboarding_completed flag (for gating navigation logic)
-- Existing users are assumed 'false' until they go through the updated flow or a manual script updates them,
-- but we default new to false explicitly.
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Notify postgREST to reload schema
NOTIFY pgrst, 'reload schema';
