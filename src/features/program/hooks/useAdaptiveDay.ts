import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { useUserProfile } from '../../onboarding/hooks/useUserProfile';
import { useProgramState } from '../../home/hooks/useProgramState';
import { useCurrentProgram } from './useProgram';
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
import { WorkoutType } from '../services/adaptiveEntryEngine';

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
  todayCardState: 'COMPLETED' | 'TARGET';
  currentProgramDay: number;
  lifecycleState: import('../../program/services/programStateEngine').TrainingLifecycleState;
  nextTrainingDateString: string;
};

/**
 * useAdaptiveDay — Phase 10 Pure Orchestrator
 *
 * Consumes the ProgramStateEngine's target (`nextSession`).
 * Fetches the specific base DayDetail from Supabase.
 * Applies in-memory adaptations based on history and payload rules.
 */
export const useAdaptiveDay = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { data: program, isLoading: progLoading } = useCurrentProgram();
  const { state: programState, isLoading: stateLoading, completeToday } = useProgramState();

  // 1. Identify Target from Engine
  const targetSession = programState?.nextSession;

  // 2. Fetch specific base day payload
  const { data: dayDetail, isLoading: dayLoading } = useDayDetail(targetSession?.id);

  // 3. Fetch feedback history
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

  // 4. Final Adaptations
  const adaptiveState = useMemo<AdaptiveDayState | null>(() => {
    if (!programState || !dayDetail || !targetSession || !profile) return null;

    // We assume analytics streak is handled separately, but we still feed it into legacy engine rules 
    // for volume limits. We will default to a streak of 1 for now if not fetching full analytics.
    const plan = computeAdaptivePlan({
      focusType: dayDetail.focusType,
      baseWorkouts: dayDetail.workouts,
      baseMeals: dayDetail.meals,
      streak: 1, // Mocked until Analytics Integration
      energyTrend: energyTrend ?? [],
      exerciseHistory: exerciseHistory ?? [],
      goal: profile.goal ?? 'General Fitness',
      missedYesterday: false, // Mocked
    });

    // Merge nextTarget's enforced volume limits from ProgramState Payload
    const lastSession = programState.lastCompletedSession;
    const isAdvanced = profile.level?.toLowerCase() === 'advanced';
    const isIntermediate = profile.level?.toLowerCase() === 'intermediate';

    if (lastSession?.difficulty === 'hard') {
      plan.volumeMultiplier = 0.5;
      plan.systemMessage = 'Volume reduced based on your last Hard session.';
      plan.recoveryMode = true;
    } else if (lastSession?.energy === 3 && isAdvanced) {
      plan.volumeMultiplier = 1.25;
      plan.systemMessage = 'High energy detected. Volume explicitly boosted.';
      plan.intensity = 'high';
    } else if (lastSession?.energy === 3 && isIntermediate) {
      plan.volumeMultiplier = 1.0;
    }

    const adaptedWorkouts = applyAdaptation(dayDetail.workouts, plan);

    let uiLabel = 'Optimized for your profile';
    if (lastSession) {
      uiLabel = `Based on your previous Day ${lastSession.programDayNumber}`;
    }

    return {
      dayDetail,
      workoutType: targetSession.focus_type as WorkoutType,
      uiLabel: profile.goal || 'General Fitness',
      uiSubLabel: uiLabel,
      adaptivePlan: plan,
      adaptedWorkouts,
      todayCompleted: programState.isTodayCompleted,
      todayCardState: programState.todayCardState,
      currentProgramDay: programState.currentProgramDay,
      lifecycleState: programState.lifecycleState,
      nextTrainingDateString: programState.nextTrainingDateString,
    };
  }, [programState, dayDetail, exerciseHistory, energyTrend, profile, targetSession]);

  return {
    adaptiveState,
    isLoading: progLoading || stateLoading || dayLoading,
    completeToday,
  };
};
