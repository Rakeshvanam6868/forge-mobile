-- Phase 6: Progress Analytics Schema
-- Creates workout_sessions table and analytics RPCs

-- 1. Create workout_sessions table
CREATE TABLE IF NOT EXISTS public.workout_sessions (
    id text PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    started_at timestamptz NOT NULL,
    completed_at timestamptz NOT NULL,
    duration integer NOT NULL, -- in minutes
    calories integer NOT NULL,
    total_volume numeric NOT NULL,
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workout sessions"
    ON public.workout_sessions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON public.workout_sessions(user_id, completed_at);

-- 2. Foreign Key for workout_sets -> workout_sessions (optional, if workout_sets already exists we might need to alter it if we want strict FKs, but skipping strict FK for flexibility initially)

-- 3. RPC: Workout Consistency
-- Returns streaks, this week count, total count
CREATE OR REPLACE FUNCTION get_workout_consistency(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_workouts integer;
    v_this_week integer;
    v_this_month integer;
    v_current_streak integer := 0;
    v_longest_streak integer := 0;
    v_last_date date;
    v_current_count integer := 0;
    r record;
BEGIN
    SELECT count(*) INTO v_total_workouts FROM workout_sessions WHERE user_id = p_user_id;
    
    SELECT count(*) INTO v_this_week FROM workout_sessions 
    WHERE user_id = p_user_id AND date_trunc('week', completed_at) = date_trunc('week', CURRENT_DATE);
    
    SELECT count(*) INTO v_this_month FROM workout_sessions 
    WHERE user_id = p_user_id AND date_trunc('month', completed_at) = date_trunc('month', CURRENT_DATE);

    FOR r IN 
        SELECT DISTINCT date(completed_at) as session_date 
        FROM workout_sessions 
        WHERE user_id = p_user_id 
        ORDER BY session_date DESC
    LOOP
        IF v_last_date IS NULL THEN
            v_current_count := 1;
            IF r.session_date >= CURRENT_DATE - integer '1' THEN
                v_current_streak := 1;
            END IF;
        ELSE
            IF v_last_date - r.session_date = 1 THEN
                v_current_count := v_current_count + 1;
                IF v_current_streak > 0 THEN
                    v_current_streak := v_current_streak + 1;
                END IF;
            ELSE
                v_current_count := 1;
            END IF;
        END IF;
        
        IF v_current_count > v_longest_streak THEN
            v_longest_streak := v_current_count;
        END IF;
        
        v_last_date := r.session_date;
    END LOOP;

    RETURN json_build_object(
        'total', v_total_workouts,
        'thisWeek', v_this_week,
        'thisMonth', v_this_month,
        'currentStreak', v_current_streak,
        'longestStreak', v_longest_streak
    );
END;
$$;


-- 4. RPC: Muscle Volume Balance
-- Returns total volume aggregated by primary muscle group
CREATE OR REPLACE FUNCTION get_muscle_volume_balance(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(json_build_object('muscle_group', t.muscle_group, 'total_volume', t.vol))
    INTO result
    FROM (
        SELECT 
            COALESCE(e.muscle_groups[1], 'Other') as muscle_group,
            SUM(ws.weight * ws.reps) as vol
        FROM workout_sets ws
        JOIN workout_sessions sess ON ws.workout_id = sess.id
        LEFT JOIN exercises e ON e.legacy_id = ws.exercise_id OR e.id::text = ws.exercise_id
        WHERE sess.user_id = p_user_id AND ws.weight IS NOT NULL AND ws.reps IS NOT NULL
        GROUP BY COALESCE(e.muscle_groups[1], 'Other')
        ORDER BY vol DESC
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;


-- 5. RPC: Exercise Progress & Strength (1RM & Weekly Trends)
CREATE OR REPLACE FUNCTION get_exercise_progress(p_user_id uuid, p_exercise_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Aggregates best weight per ISO week
    SELECT COALESCE(json_agg(json_build_object(
        'week', t.week_num,
        'year', t.year_num,
        'best_weight', t.best_w,
        'best_reps', t.best_r,
        'max_1rm', t.max_orm,
        'max_volume', t.max_vol
    )), '[]'::json)
    INTO result
    FROM (
        SELECT 
            EXTRACT(isoyear FROM sess.completed_at) as year_num,
            EXTRACT(week FROM sess.completed_at) as week_num,
            MAX(ws.weight) as best_w,
            MAX(ws.reps) as best_r,
            MAX(ws.weight * (1 + ws.reps / 30.0)) as max_orm,
            MAX(ws.weight * ws.reps) as max_vol
        FROM workout_sets ws
        JOIN workout_sessions sess ON ws.workout_id = sess.id
        WHERE sess.user_id = p_user_id AND ws.exercise_id = p_exercise_id
          AND ws.weight IS NOT NULL
        GROUP BY year_num, week_num
        ORDER BY year_num ASC, week_num ASC
    ) t;

    RETURN result;
END;
$$;


-- 6. RPC: Weekly Training Volume (All exercises)
CREATE OR REPLACE FUNCTION get_weekly_volume(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT COALESCE(json_agg(json_build_object(
        'week', t.week_num,
        'year', t.year_num,
        'total_volume', t.total_vol
    )), '[]'::json)
    INTO result
    FROM (
        SELECT 
            EXTRACT(isoyear FROM completed_at) as year_num,
            EXTRACT(week FROM completed_at) as week_num,
            SUM(total_volume) as total_vol
        FROM workout_sessions
        WHERE user_id = p_user_id
        GROUP BY year_num, week_num
        ORDER BY year_num ASC, week_num ASC
    ) t;

    RETURN result;
END;
$$;

-- 7. RPC: Best Lifts Summary (PRs for all exercises)
CREATE OR REPLACE FUNCTION get_personal_records(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT COALESCE(json_agg(json_build_object(
        'exercise_id', t.exercise_id,
        'exercise_name', COALESCE(e.name, t.exercise_id),
        'max_weight', t.max_w,
        'max_reps', t.max_r,
        'max_volume', t.max_v
    )), '[]'::json)
    INTO result
    FROM (
        SELECT 
            ws.exercise_id,
            MAX(ws.weight) as max_w,
            MAX(ws.reps) as max_r,
            MAX(ws.weight * ws.reps) as max_v
        FROM workout_sets ws
        JOIN workout_sessions sess ON ws.workout_id = sess.id
        WHERE sess.user_id = p_user_id AND ws.weight IS NOT NULL
        GROUP BY ws.exercise_id
    ) t
    LEFT JOIN exercises e ON e.legacy_id = t.exercise_id OR e.id::text = t.exercise_id;

    RETURN result;
END;
$$;
