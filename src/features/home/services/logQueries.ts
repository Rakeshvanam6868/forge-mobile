import { supabase } from '../../../core/supabase/client';
import { toDateString } from '../../../core/utils/dateUtils';
import { DailyLogRow } from './consistencyEngine';

// ──────────────────────────────────────────────
// Supabase Query Functions — targets plan_logs table
// ──────────────────────────────────────────────

/**
 * Fetch ALL plan_logs for a user.
 * SINGLE QUERY — eliminates race conditions between count and logs.
 *
 * For a fitness app, even after 1 year of daily use = 365 rows ≈ 36KB.
 * This is trivially small and avoids the need for a separate count query.
 */
export const getAllLogs = async (userId: string): Promise<DailyLogRow[]> => {
  const { data, error } = await supabase
    .from('plan_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', true)
    .order('log_date', { ascending: false });

  if (error) throw error;
  return (data ?? []) as DailyLogRow[];
};

/**
 * Insert or upsert a plan log for today.
 * Uses UNIQUE(user_id, log_date) to prevent duplicates.
 */
export const upsertTodayLog = async (
  userId: string,
  completed: boolean,
  energy: number
) => {
  const logDate = toDateString(new Date());

  const { data, error } = await supabase
    .from('plan_logs')
    .upsert(
      {
        user_id: userId,
        log_date: logDate,
        completed,
        energy,
      },
      { onConflict: 'user_id, log_date' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
};
