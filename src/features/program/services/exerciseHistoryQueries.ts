import { supabase } from '../../../core/supabase/client';
import { toDateString } from '../../../core/utils/dateUtils';
import { ExerciseHistoryRecord, Difficulty } from './adaptiveEngine';

// ═══════════════════════════════════════════════
// Exercise History Queries
// ═══════════════════════════════════════════════

/**
 * Fetch all exercise history records for a user.
 * One row per exercise (UNIQUE user_id + exercise_id).
 */
export const getExerciseHistory = async (
  userId: string
): Promise<ExerciseHistoryRecord[]> => {
  const { data, error } = await supabase
    .from('exercise_history')
    .select('exercise_id, last_sets, last_reps, last_weight, difficulty')
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []) as ExerciseHistoryRecord[];
};

/**
 * Batch upsert exercise history after workout completion.
 * Idempotent — uses UNIQUE(user_id, exercise_id) for conflict resolution.
 */
export const upsertExerciseHistory = async (
  userId: string,
  exercises: {
    exercise_id: string;
    sets: number | null;
    reps: number | null;
    difficulty: Difficulty;
  }[]
): Promise<void> => {
  if (exercises.length === 0) return;

  const todayStr = toDateString(new Date());
  const rows = exercises.map((e) => ({
    user_id: userId,
    exercise_id: e.exercise_id,
    last_sets: e.sets,
    last_reps: e.reps,
    last_weight: null,
    difficulty: e.difficulty,
    performed_at: todayStr,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('exercise_history')
    .upsert(rows, { onConflict: 'user_id, exercise_id' });

  if (error) throw error;
};

/**
 * Get last N energy values from plan_logs (newest first).
 * Energy is stored as integer (1=low, 2=avg, 3=high) in plan_logs.
 */
export const getLastNEnergyLogs = async (
  userId: string,
  n: number = 2
): Promise<number[]> => {
  const { data, error } = await supabase
    .from('plan_logs')
    .select('energy')
    .eq('user_id', userId)
    .eq('completed', true)
    .order('log_date', { ascending: false })
    .limit(n);

  if (error) throw error;
  return (data ?? []).map((row: any) => row.energy as number);
};
