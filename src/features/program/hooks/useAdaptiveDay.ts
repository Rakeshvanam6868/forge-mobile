import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/supabase/client';
import { useAuth } from '../../auth/hooks/useAuth';
import { useUserProfile } from '../../onboarding/hooks/useUserProfile';
import { useProgramState } from '../../home/hooks/useProgramState';
import { useCurrentProgram } from './useProgram';
import { useDayDetail, DayDetail } from './useDayDetail';
import {
  computeNextWorkout,
  UserTrainingState,
  UserWorkoutHistory,
  WorkoutType,
} from '../services/adaptiveEntryEngine';
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
  // Adaptive layer
  workoutType: WorkoutType;
  adaptivePlan: AdaptivePlan;
  adaptedWorkouts: AdaptedWorkout[];
  uiLabel: string;
  uiSubLabel: string;
  // State from consistency engine
  todayCompleted: boolean;
  todaySkipped: boolean;
  streak: number;
  missedYesterday: boolean;
};

/**
 * useAdaptiveDay — orchestrates the full adaptive day flow.
 *
 * 1. Fetches logs + streak + missedYesterday
 * 2. Runs computeNextWorkout to get the exact next muscle group to hit
 * 3. Identifies the specific base DayDetail from Supabase
 * 4. Applies in-memory adaptations based on history
 */
export const useAdaptiveDay = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { data: program, isLoading: progLoading } = useCurrentProgram();
  const { state: continuityState, isLoading: stateLoading, completeToday } = useProgramState();

  // 1. Identify Next Target via the Pure Adaptive Entry Engine
  const nextTarget = useMemo(() => {
    if (!profile || !continuityState) return null;

    const engineState: UserTrainingState = {
      level: (profile.level || 'beginner').toLowerCase() as any,
      frequency: profile.weekly_frequency as any,
      lastWorkout: profile.last_workout_type as any,
      goal: (profile.goal || 'general_fitness').toLowerCase() as any,
    };

    // Construct history from logs
    let history: UserWorkoutHistory = {};
    const logs = continuityState.allLogs;
    if (logs && logs.length > 0) {
      // Find the last completed active workout (ignore plain skips that have no type)
      const lastCompleted = logs.find(l => l.status === 'completed');
      if (lastCompleted) {
        // Here we ideally need the last workout's type. 
        // For now, we trust the profile's 'last_workout_type' if we don't store type locally.
        // But let's assume the backend 'difficulty' maps cleanly.
        history = {
          lastCompletionDate: lastCompleted.log_date,
          lastDifficulty: lastCompleted.difficulty,
          lastEnergy: lastCompleted.energy,
          // If we had a mechanism to fetch the last session type from plan_day_id we would here,
          // but relying on the onboarding state combined with log dates is enough for MVP rules.
        };
      }
    }

    return computeNextWorkout(engineState, history, new Date());
  }, [profile, continuityState]);

  // 2. Fetch all program days to pick the matching base template
  const { data: programDays, isLoading: pDaysLoading } = useQuery({
    queryKey: ['allProgramDays', program?.id],
    queryFn: async () => {
      if (!program?.id) return [];
      
      // Fetch weeks
      const { data: weeks } = await supabase.from('program_weeks').select('id').eq('program_id', program.id);
      if (!weeks || weeks.length === 0) return [];
      
      const weekIds = weeks.map(w => w.id);
      const { data: days } = await supabase.from('program_days').select('*').in('program_week_id', weekIds);
      return days || [];
    },
    enabled: !!program?.id,
  });

  // 3. Select the best match Day ID
  const selectedDayId = useMemo(() => {
    if (!nextTarget || !programDays || !continuityState) return null;
    
    // Filter days matching the required focus_type
    const matchingDays = programDays.filter(d => d.focus_type === nextTarget.workoutType);
    if (matchingDays.length === 0) {
      // Fallback if the requested type doesn't exist, just grab the first day
      return programDays[0]?.id;
    }

    // Identify which days the user has already completed
    const completedDayIds = new Set(continuityState.allLogs.filter(l => l.status === 'completed').map(l => l.plan_day_id));
    
    // Pick the first matching day they HAVEN'T done, or just wrap around to the first one
    const nextUnseenDay = matchingDays.find(d => !completedDayIds.has(d.id));
    return nextUnseenDay ? nextUnseenDay.id : matchingDays[0].id;
  }, [nextTarget, programDays, continuityState]);

  // 4. Fetch specific base day payload
  const { data: dayDetail, isLoading: dayLoading } = useDayDetail(selectedDayId);

  // 5. Fetch feedback history
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

  // 6. Final Adaptations
  const adaptiveState = useMemo<AdaptiveDayState | null>(() => {
    if (!continuityState || !dayDetail || !nextTarget) return null;

    const plan = computeAdaptivePlan({
      focusType: dayDetail.focusType,
      baseWorkouts: dayDetail.workouts,
      baseMeals: dayDetail.meals,
      streak: continuityState.streak,
      energyTrend: energyTrend ?? [],
      exerciseHistory: exerciseHistory ?? [],
      goal: profile?.goal ?? 'General Fitness',
      missedYesterday: continuityState.missedYesterday,
    });

    // Merge nextTarget's enforced volume limits (derived from last tracking)
    if (nextTarget.volumeModifier === 'reduced') {
      plan.volumeMultiplier = 0.5;
    } else if (nextTarget.volumeModifier === 'intense') {
      plan.volumeMultiplier = 1.25;
    }

    const adaptedWorkouts = applyAdaptation(dayDetail.workouts, plan);

    return {
      dayDetail,
      workoutType: nextTarget.workoutType,
      uiLabel: nextTarget.uiLabel,
      uiSubLabel: nextTarget.uiSubLabel,
      adaptivePlan: plan,
      adaptedWorkouts,
      todayCompleted: continuityState.todayCompleted,
      todaySkipped: continuityState.todaySkipped,
      streak: continuityState.streak,
      missedYesterday: continuityState.missedYesterday,
    };
  }, [continuityState, dayDetail, exerciseHistory, energyTrend, profile, nextTarget]);

  return {
    adaptiveState,
    isLoading: progLoading || stateLoading || pDaysLoading || dayLoading,
    completeToday,
  };
};
