import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { useUserProfile } from '../../onboarding/hooks/useUserProfile';
import { useProgramState } from '../../home/hooks/useProgramState';
import { useCurrentProgram } from './useProgram';
import { useCurrentWeek, ProgramDay } from './useWeekPlan';
import { useDayDetail, DayDetail } from './useDayDetail';
import {
  computeAdaptivePlan,
  applyAdaptation,
  AdaptivePlan,
  AdaptedWorkout,
} from '../services/adaptiveEngine';
import {
  getExerciseHistory,
  getLastNEnergyLogs,
} from '../services/exerciseHistoryQueries';

export type AdaptiveDayState = {
  // Base data
  dayDetail: DayDetail;
  programDay: number;
  currentWeekNumber: number;
  dayNumberInWeek: number;
  // Adaptive layer
  adaptivePlan: AdaptivePlan;
  adaptedWorkouts: AdaptedWorkout[];
  // State from consistency engine
  todayCompleted: boolean;
  streak: number;
  missedYesterday: boolean;
};

/**
 * useAdaptiveDay — orchestrates the full adaptive day flow.
 *
 * 1. Fetches logs + streak + missedYesterday (useProgramState)
 * 2. Fetches base program day (useDayDetail)
 * 3. Fetches exercise_history + last 2 energy logs
 * 4. Computes adaptivePlan via pure function
 * 5. Applies adaptation to workouts in-memory
 * 6. Returns complete adaptive UI model
 *
 * Fallback: if adaptive data is unavailable, returns base program.
 */
export const useAdaptiveDay = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { data: program, isLoading: progLoading } = useCurrentProgram();
  const { state, isLoading: stateLoading, completeToday } = useProgramState();

  // Progress from logs
  const { programDay, currentWeekNumber, dayNumberInWeek } = state?.progress ?? {
    programDay: 1,
    currentWeekNumber: 1,
    dayNumberInWeek: 1,
  };

  // Fetch base program data
  const { data: weekData, isLoading: weekLoading } = useCurrentWeek(program?.id, currentWeekNumber);
  const currentDay: ProgramDay | undefined = weekData?.days.find(
    (d) => d.day_number === dayNumberInWeek
  );
  const { data: dayDetail, isLoading: dayLoading } = useDayDetail(currentDay?.id);

  // Fetch adaptive inputs
  const { data: exerciseHistory } = useQuery({
    queryKey: ['exerciseHistory', user?.id],
    queryFn: () => getExerciseHistory(user!.id),
    enabled: !!user?.id,
  });

  const { data: energyTrend } = useQuery({
    queryKey: ['energyTrend', user?.id],
    queryFn: () => getLastNEnergyLogs(user!.id, 2),
    enabled: !!user?.id,
  });

  // Compute adaptive plan (pure, deterministic)
  const adaptiveState = useMemo<AdaptiveDayState | null>(() => {
    if (!state || !dayDetail) return null;

    const plan = computeAdaptivePlan({
      focusType: dayDetail.focusType,
      baseWorkouts: dayDetail.workouts,
      baseMeals: dayDetail.meals,
      streak: state.streak,
      energyTrend: energyTrend ?? [],
      exerciseHistory: exerciseHistory ?? [],
      goal: profile?.goal ?? 'General Fitness',
      missedYesterday: state.missedYesterday,
    });

    const adaptedWorkouts = applyAdaptation(dayDetail.workouts, plan);

    return {
      dayDetail,
      programDay,
      currentWeekNumber,
      dayNumberInWeek,
      adaptivePlan: plan,
      adaptedWorkouts,
      todayCompleted: state.todayCompleted,
      streak: state.streak,
      missedYesterday: state.missedYesterday,
    };
  }, [state, dayDetail, exerciseHistory, energyTrend, profile, programDay, currentWeekNumber, dayNumberInWeek]);

  return {
    adaptiveState,
    isLoading: progLoading || stateLoading || weekLoading || dayLoading,
    completeToday,
  };
};
