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
import { EXERCISE_POOL } from '../data/exercisePools';

export type AdaptiveDayState = {
  // Base data
  dayDetail: DayDetail;
  // Adaptive layer
  workoutType: WorkoutType;
  adaptivePlan: AdaptivePlan;
  adaptedWorkouts: AdaptedWorkout[];
  sections: { title: string; data: AdaptedWorkout[] }[];
  uiLabel: string;
  uiSubLabel: string;
  // State from consistency engine
  todayCompleted: boolean;
  todayCardState: 'COMPLETED' | 'TARGET';
  currentProgramDay: number;
  lifecycleState: import('../../program/services/programStateEngine').TrainingLifecycleState;
  nextTrainingDateString: string;
  lastCompletedSession: {
    programDayNumber: number;
    difficulty: string | null;
    energy: number | null;
  } | null;
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
  const { state: programState, isLoading: stateLoading, isError: programStateError, completeToday } = useProgramState();

  // 1. Identify Target from Engine
  const targetSession = programState?.nextSession;

  // 2. Fetch specific base day payload
  const { data: dayDetail, isLoading: dayLoading, isError: dayError, error: dError } = useDayDetail(targetSession?.id);
  
  if (dError) {
    console.error('[useAdaptiveDay] Day detail fetch error:', dError);
  }

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

    const sectionsMap: Record<string, AdaptedWorkout[]> = {
      'Warmup': [],
      'Compound': [],
      'Accessory (Primary)': [],
      'Accessory (Secondary)': [],
      'Isolation': [],
      'Core/Cardio': [],
    };

    let accessoryCount = 0;
    adaptedWorkouts.forEach(w => {
      const poolEx = EXERCISE_POOL.find(e => e.name === w.exercise_name);
      const cat = poolEx?.category || 'accessory';
      
      (w as any).poolCategory = cat;
      (w as any).poolEquipment = poolEx?.equipment || [];
      (w as any).poolId = poolEx?.id;

      if (cat === 'warmup') {
        sectionsMap['Warmup'].push(w);
      } else if (cat === 'compound') {
        sectionsMap['Compound'].push(w);
      } else if (cat === 'isolation') {
        sectionsMap['Isolation'].push(w);
      } else if (cat === 'core_cardio') {
        sectionsMap['Core/Cardio'].push(w);
      } else {
        if (accessoryCount === 0) {
          sectionsMap['Accessory (Primary)'].push(w);
          accessoryCount++;
        } else {
          sectionsMap['Accessory (Secondary)'].push(w);
        }
      }
    });

    const sections = Object.keys(sectionsMap)
      .filter(key => sectionsMap[key].length > 0)
      .map(key => ({ title: key, data: sectionsMap[key] }));

    console.log('[DEBUG] Generated workout:', sections);

    return {
      dayDetail,
      workoutType: targetSession.focus_type as WorkoutType,
      uiLabel: profile.goal || 'General Fitness',
      uiSubLabel: uiLabel,
      adaptivePlan: plan,
      adaptedWorkouts,
      sections,
      todayCompleted: programState.isTodayCompleted,
      todayCardState: programState.todayCardState,
      currentProgramDay: programState.currentProgramDay,
      lifecycleState: programState.lifecycleState,
      nextTrainingDateString: programState.nextTrainingDateString,
      lastCompletedSession: programState.lastCompletedSession,
    };
  }, [programState, dayDetail, exerciseHistory, energyTrend, profile, targetSession]);

  return {
    adaptiveState,
    lifecycleState: programState?.lifecycleState || 'NOT_STARTED',
    isLoading: progLoading || stateLoading || (!!targetSession?.id && dayLoading),
    isError: programStateError || dayError,
    completeToday,
  };
};
