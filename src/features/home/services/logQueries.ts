import { supabase } from '../../../core/supabase/client';
import { toDateString } from '../../../core/utils/dateUtils';
import { DailyLogRow } from './consistencyEngine';

// ──────────────────────────────────────────────
// Supabase Query Functions — targets daily_logs table
// ──────────────────────────────────────────────

/**
 * Fetch ALL daily_logs for a user.
 * SINGLE QUERY — eliminates race conditions between count and logs.
 */
export const getAllLogs = async (userId: string): Promise<DailyLogRow[]> => {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: false });

  if (error) throw error;
  return (data ?? []) as DailyLogRow[];
};

/**
 * Insert or upsert a session log for today.
 * Handles both completion and explicit SKIPs.
 */
export const upsertTodayLog = async (
  userId: string,
  planDayId: string | null,
  status: 'completed' | 'skipped',
  energy: string,
  difficulty?: string
) => {
  const logDate = toDateString(new Date());

  const payload: any = {
    user_id: userId,
    log_date: logDate,
    status,
    energy,
    is_skipped: status === 'skipped',
  };

  if (planDayId) payload.plan_day_id = planDayId;
  if (difficulty) payload.difficulty = difficulty;
  if (status === 'completed') payload.completed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('daily_logs')
    .upsert(payload, { onConflict: 'user_id, log_date' })
    .select()
    .single();

  if (error) throw error;
  return data;
};
