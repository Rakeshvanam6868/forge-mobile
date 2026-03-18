-- 014_rls_audit.sql
-- Enables RLS and creates strict access policies for user-specific data

-- 1. `users` table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile" ON users
            FOR SELECT USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile" ON users
            FOR UPDATE USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can insert their own profile'
    ) THEN
        CREATE POLICY "Users can insert their own profile" ON users
            FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- 2. `user_events` table (Analytics/Retention)
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_events' AND policyname = 'Users can view their own events'
    ) THEN
        CREATE POLICY "Users can view their own events" ON user_events
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_events' AND policyname = 'Users can insert their own events'
    ) THEN
        CREATE POLICY "Users can insert their own events" ON user_events
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_events' AND policyname = 'Users can update their own events'
    ) THEN
        CREATE POLICY "Users can update their own events" ON user_events
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 3. `exercise_history` table
ALTER TABLE exercise_history ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'exercise_history' AND policyname = 'Users can view their own exercise history'
    ) THEN
        CREATE POLICY "Users can view their own exercise history" ON exercise_history
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'exercise_history' AND policyname = 'Users can insert their own exercise history'
    ) THEN
        CREATE POLICY "Users can insert their own exercise history" ON exercise_history
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'exercise_history' AND policyname = 'Users can update their own exercise history'
    ) THEN
        CREATE POLICY "Users can update their own exercise history" ON exercise_history
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- NOTE: `programs`, `day_workouts`, `day_meals`, and `workout_sets` have been previously audited in 005_program_engine.sql.
-- Ensure to apply this migration to production.
