-- Migration: Create Exercises Table

CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_id text UNIQUE NOT NULL, -- Used to map 'ex-push-ups'
  name text NOT NULL,
  muscle_groups text[] NOT NULL,
  category text NOT NULL,
  equipment text[] NOT NULL,
  default_sets integer,
  default_reps text,
  duration text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access
CREATE POLICY "Allow public read access to exercises"
  ON public.exercises FOR SELECT
  USING (true);

-- Allow anonymous insert for the initial seed (Optional/Temporary, but helpful for our JS seed script)
CREATE POLICY "Allow anon insert for seeding"
  ON public.exercises FOR INSERT
  WITH CHECK (true);
