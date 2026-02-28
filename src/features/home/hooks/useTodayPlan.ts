import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/supabase/client';
import { useAuth } from '../../auth/hooks/useAuth';
import { getAllLogs } from '../services/logQueries';

/**
 * Fetches today's workout plan based on user-controlled progression.
 *
 * Which workout to show = (totalCompleted % 7) + 1
 * Uses the SAME allLogs query as useProgramState — single source of truth.
 */
export const useTodayPlan = () => {
  const { user } = useAuth();

  // Use the SAME query key as useProgramState — React Query deduplicates automatically
  const { data: allLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['allLogs', user?.id],
    queryFn: () => getAllLogs(user!.id),
    enabled: !!user?.id,
  });

  const totalCompleted = allLogs?.length ?? 0;

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ['todayPlan', user?.id, totalCompleted],
    queryFn: async () => {
      if (!user?.id || allLogs === undefined) return null;

      // Map to 1-7 workout cycle
      const dayNumber = (totalCompleted % 7) + 1;

      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('day_number', dayNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // no row found
        throw error;
      }

      return data;
    },
    enabled: !!user?.id && allLogs !== undefined,
  });

  return {
    data: plan,
    isLoading: logsLoading || planLoading,
  };
};
