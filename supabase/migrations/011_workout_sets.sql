-- Create workout_sets tracking table
CREATE TABLE IF NOT EXISTS workout_sets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id text NOT NULL,
  exercise_id text NOT NULL,
  set_number integer NOT NULL,
  weight numeric,
  reps integer,
  duration integer,
  timestamp timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own sets
CREATE POLICY "Users can insert their own sets"
  ON workout_sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own sets"
  ON workout_sets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sets"
  ON workout_sets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sets"
  ON workout_sets FOR DELETE
  USING (auth.uid() = user_id);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_workout_sets_user_exercise 
  ON workout_sets(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_id 
  ON workout_sets(workout_id);
