import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { supabase } from '../../../core/supabase/client';
import { toDateString } from '../../../core/utils/dateUtils';
import { computeAnalytics } from '../services/analyticsEngine';
import { UserEvent, AnalyticsResult } from '../types/analytics';

/**
 * useAnalytics — single query + memoized pure computation.
 *
 * 1. Fetches ALL user_events for current user (one query)
 * 2. Runs computeAnalytics in useMemo (pure, deterministic)
 * 3. Returns AnalyticsResult
 *
 * No additional queries. No writes.
 */
export const useAnalytics = () => {
  const { user } = useAuth();

  const { data: events, isLoading } = useQuery({
    queryKey: ['userEvents', user?.id],
    queryFn: async (): Promise<UserEvent[]> => {
      const { data, error } = await supabase
        .from('user_events')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as UserEvent[];
    },
    enabled: !!user?.id,
  });

  const analytics = useMemo<AnalyticsResult | null>(() => {
    if (!events) return null;
    const today = toDateString(new Date());
    return computeAnalytics(events, today);
  }, [events]);

  return { analytics, isLoading };
};
