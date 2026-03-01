import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { useUserProfile } from '../../onboarding/hooks/useUserProfile';
import { getAllLogs, upsertTodayLog } from '../services/logQueries';
import { toDateString } from '../../../core/utils/dateUtils';
import {
  isTodayCompleted,
  isTodaySkipped,
  wasMissedYesterday,
  calculateStreak,
  calculateLongestStreak,
  calculateCompletionInPeriod,
  buildFullGrid,
  GridDay,
  DailyLogRow,
} from '../services/consistencyEngine';
import { trackEvent } from '../../retention/services/retentionService';

export type ProgramState = {
  todayCompleted: boolean;
  todaySkipped: boolean;
  missedYesterday: boolean;
  completedThisWeek: number;
  completedThisMonth: number;
  streak: number;
  longestStreak: number;
  grid: GridDay[];
  allLogs: DailyLogRow[];
};

export const useProgramState = () => {
  const { user } = useAuth();
  const { profile, isLoading: isProfileLoading } = useUserProfile();
  const queryClient = useQueryClient();

  // SINGLE QUERY — fetches ALL completed logs
  const { data: allLogs, isLoading } = useQuery({
    queryKey: ['allLogs', user?.id],
    queryFn: () => getAllLogs(user!.id),
    enabled: !!user?.id,
  });

  // Derive ALL state from pure functions + single query result
  const state = useMemo<ProgramState | null>(() => {
    if (!profile || !allLogs) return null;

    const startDate = profile.program_start_date
      || (profile.created_at ? profile.created_at.split('T')[0] : toDateString(new Date()));

    const todayCompleted = isTodayCompleted(allLogs);
    const todaySkipped = isTodaySkipped(allLogs);
    const missedYesterday = wasMissedYesterday(allLogs, startDate);
    const streak = calculateStreak(allLogs, startDate);
    const longestStreak = calculateLongestStreak(allLogs, startDate);
    const weekly = calculateCompletionInPeriod(allLogs, 7);
    const monthly = calculateCompletionInPeriod(allLogs, 30);
    const grid = buildFullGrid(allLogs, startDate);

    return {
      todayCompleted,
      todaySkipped,
      missedYesterday,
      completedThisWeek: weekly.completed,
      completedThisMonth: monthly.completed,
      streak,
      longestStreak,
      grid,
      allLogs,
    };
  }, [profile, allLogs]);

  const completeToday = useMutation({
    mutationFn: async ({
      energyLevel,
      difficulty = 'perfect',
      planDayId = null,
      status = 'completed',
    }: {
      energyLevel: number;
      difficulty?: string;
      planDayId?: string | null;
      status?: 'completed' | 'skipped';
    }) => {
      if (!user?.id) throw new Error('No user');
      const energyMap = { 1: 'low', 2: 'medium', 3: 'high' } as Record<number, string>;
      return upsertTodayLog(user.id, planDayId, status, energyMap[energyLevel] || 'medium', difficulty);
    },
    onSuccess: () => {
      // Invalidate logs → everything re-derives
      queryClient.invalidateQueries({ queryKey: ['allLogs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['programWeek'] });
      queryClient.invalidateQueries({ queryKey: ['dayDetail'] });
      queryClient.invalidateQueries({ queryKey: ['todayPlan'] });
      queryClient.invalidateQueries({ queryKey: ['exerciseHistory', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['energyTrend', user?.id] });

      // Track retention events (fire-and-forget)
      if (user?.id) {
        trackEvent(user.id, 'DAY_COMPLETED', { streak: state?.streak });
        if (state?.missedYesterday) {
          trackEvent(user.id, 'STREAK_BROKEN', { previousStreak: state?.streak });
        }
      }
    },
  });

  const isHydrating = isLoading || isProfileLoading || !profile || !allLogs || !state;

  return {
    state,
    isLoading: isHydrating,
    completeToday,
  };
};
