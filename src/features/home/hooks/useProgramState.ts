import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { useUserProfile } from '../../onboarding/hooks/useUserProfile';
import { getAllLogs, upsertTodayLog } from '../services/logQueries';
import { toDateString } from '../../../core/utils/dateUtils';
import {
  getProgramDay,
  getWorkoutDayNumber,
  getProgramProgress,
  isTodayCompleted,
  wasMissedYesterday,
  calculateStreak,
  calculateCompletionInPeriod,
  buildFullGrid,
  GridDay,
  ProgramProgress,
} from '../services/consistencyEngine';

export type ProgramState = {
  currentProgramDay: number;
  workoutDayNumber: number;
  todayCompleted: boolean;
  missedYesterday: boolean;
  completedThisWeek: number;
  completedThisMonth: number;
  streak: number;
  grid: GridDay[];
  // Program progress (derived from logs only)
  progress: ProgramProgress;
};

export const useProgramState = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
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

    const totalCompleted = allLogs.length;
    const currentProgramDay = getProgramDay(totalCompleted);
    const workoutDayNumber = getWorkoutDayNumber(totalCompleted);
    const progress = getProgramProgress(totalCompleted);

    const todayCompleted = isTodayCompleted(allLogs);
    const missedYesterday = wasMissedYesterday(allLogs, startDate);
    const streak = calculateStreak(allLogs, startDate);
    const weekly = calculateCompletionInPeriod(allLogs, 7);
    const monthly = calculateCompletionInPeriod(allLogs, 30);
    const grid = buildFullGrid(allLogs, startDate);

    return {
      currentProgramDay,
      workoutDayNumber,
      todayCompleted,
      missedYesterday,
      completedThisWeek: weekly.completed,
      completedThisMonth: monthly.completed,
      streak,
      grid,
      progress,
    };
  }, [profile, allLogs]);

  // Mutation: complete today
  const completeToday = useMutation({
    mutationFn: async (energyLevel: number) => {
      if (!user?.id) throw new Error('No user');
      return upsertTodayLog(user.id, true, energyLevel);
    },
    onSuccess: () => {
      // Invalidate logs → everything re-derives
      queryClient.invalidateQueries({ queryKey: ['allLogs', user?.id] });
      // Invalidate program queries so TodayScreen/WeekScreen refetch for new day
      queryClient.invalidateQueries({ queryKey: ['programWeek'] });
      queryClient.invalidateQueries({ queryKey: ['dayDetail'] });
      queryClient.invalidateQueries({ queryKey: ['todayPlan'] });
    },
  });

  return {
    state,
    isLoading,
    completeToday,
  };
};
