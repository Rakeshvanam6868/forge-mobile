-- Add suggested_weight to exercise_history for smart progressions

ALTER TABLE public.exercise_history
ADD COLUMN suggested_weight FLOAT;
