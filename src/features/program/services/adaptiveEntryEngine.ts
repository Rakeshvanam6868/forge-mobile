export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';
export type WeeklyFrequency = '0' | '1-2' | '3-4' | '5+';
export type WorkoutType =
  | 'push'
  | 'pull'
  | 'legs'
  | 'upper'
  | 'lower'
  | 'full'
  | 'cardio'
  | 'cardio_core'
  | 'upper_hypertrophy'
  | 'mobility'
  | 'rest'
  | 'none';

export type Goal = 'fat_loss' | 'muscle_gain' | 'recomp' | 'general_fitness';

export type UserTrainingState = {
  level: TrainingLevel;
  frequency: WeeklyFrequency;
  lastWorkout: WorkoutType;
  goal: Goal;
};

export type UserWorkoutHistory = {
  lastCompletedProgramDay?: number;
  lastCompletedWorkoutType?: WorkoutType;
  lastCompletionDate?: string; // YYYY-MM-DD format
  skippedDaysInRow?: number;
  lastDifficulty?: 'easy' | 'perfect' | 'hard' | string;
  lastEnergy?: 'low' | 'medium' | 'high' | string;
  recentWorkouts?: { type: WorkoutType, date: string }[];
};

export type AdaptiveWorkoutOutput = {
  programIndex: number;
  workoutType: WorkoutType;
  reason: string;
  recoveryOptimized: boolean;
  volumeModifier: 'reduced' | 'normal' | 'intense';
  uiLabel: string;
  uiSubLabel: string;
};

// DO NOT MODIFY
export const PROGRAM_DAYS = [
  'push',
  'pull',
  'legs',
  'cardio_core',
  'upper_hypertrophy',
  'mobility',
  'rest',
] as const;

const GOAL_LABELS: Record<Goal, string> = {
  muscle_gain: 'Progressive overload focus',
  fat_loss: 'Calorie burn optimization',
  recomp: 'Performance & composition balance',
  general_fitness: 'Consistency focus',
};

const LEVEL_VOLUME: Record<TrainingLevel, 'reduced' | 'normal' | 'intense'> = {
  beginner: 'reduced',
  intermediate: 'normal',
  advanced: 'intense',
};

/**
 * Ensures date string is strictly YYYY-MM-DD
 */
function normalizeDate(d: string | Date): string {
  if (typeof d === 'string') return d.split('T')[0];
  return d.toISOString().split('T')[0];
}

/**
 * Calculates days between two YYYY-MM-DD strings.
 */
function getDaysDifference(d1: string, d2: string): number {
  const time1 = new Date(d1).getTime();
  const time2 = new Date(d2).getTime();
  return Math.floor((time1 - time2) / (1000 * 3600 * 24));
}

function getProgramIndexForType(type: WorkoutType): number {
  // Try exact match
  const idx = PROGRAM_DAYS.indexOf(type as any);
  if (idx !== -1) return idx;
  
  // Fallbacks for types not explicitly in array
  if (type === 'cardio') return PROGRAM_DAYS.indexOf('cardio_core');
  if (type === 'full') return 0; // mapped to start if needed
  if (type === 'none') return 0;
  return 0;
}

function getMuscleGroupsForType(type: WorkoutType): string[] {
  switch (type) {
    case 'push': return ['chest', 'shoulders', 'triceps'];
    case 'pull': return ['back', 'biceps'];
    case 'legs':
    case 'lower': return ['legs', 'core'];
    case 'upper':
    case 'upper_hypertrophy': return ['chest', 'back', 'shoulders', 'biceps', 'triceps'];
    case 'full': return ['chest', 'back', 'legs', 'shoulders', 'core', 'biceps', 'triceps'];
    default: return [];
  }
}

export function computeNextWorkout(
  state: UserTrainingState,
  history: UserWorkoutHistory,
  todayDateInput: string | Date
): AdaptiveWorkoutOutput {
  const today = normalizeDate(todayDateInput);
  
  // 1️⃣ HARD REALITY (HISTORY > ONBOARDING)
  const hasHistory = !!history.lastCompletedWorkoutType && !!history.lastCompletionDate;
  const lastType: WorkoutType = hasHistory
    ? history.lastCompletedWorkoutType!
    : state.lastWorkout;
  
  let daysInactivity = 0;
  if (hasHistory && history.lastCompletionDate) {
    daysInactivity = getDaysDifference(today, normalizeDate(history.lastCompletionDate));
  }

  // Handle edge case: User trained today already
  if (daysInactivity === 0 && hasHistory) {
    return {
      programIndex: getProgramIndexForType('mobility'),
      workoutType: 'mobility',
      reason: 'Already trained today',
      recoveryOptimized: true,
      volumeModifier: 'reduced',
      uiLabel: GOAL_LABELS[state.goal || 'general_fitness'],
      uiSubLabel: 'Active recovery (trained today)',
    };
  }

  // Determine standard volume based on level
  let volumeModifier = LEVEL_VOLUME[state.level || 'beginner'];

  // PART 5 — ADAPTIVE CONTINUITY FEEDBACK
  if (history.lastDifficulty === 'hard') {
    volumeModifier = 'reduced';
  } else if (history.lastEnergy === 'high' && state.level === 'advanced') {
    volumeModifier = 'intense';
  } else if (history.lastEnergy === 'high' && state.level === 'intermediate') {
    volumeModifier = 'normal';
  }

  // 3️⃣ INACTIVITY DETECTION
  if (daysInactivity >= 7) {
    return {
      programIndex: getProgramIndexForType('full'),
      workoutType: 'full',
      reason: 'Welcome back — restarting with a smart low-volume session',
      recoveryOptimized: true,
      volumeModifier: 'reduced', // Forced reduction
      uiLabel: GOAL_LABELS[state.goal || 'general_fitness'],
      uiSubLabel: 'Welcome back — restarting with a smart low-volume session',
    };
  } else if (daysInactivity >= 3) {
    return {
      programIndex: getProgramIndexForType('full'),
      workoutType: 'full',
      reason: 'Restart after inactivity',
      recoveryOptimized: true,
      volumeModifier: volumeModifier || (LEVEL_VOLUME[state.level || 'beginner']),
      uiLabel: GOAL_LABELS[state.goal || 'general_fitness'],
      uiSubLabel: 'Restart after short break',
    };
  }
  // Base Sequence Map
  let nextType: WorkoutType = 'push';
  
  // 4️⃣ NEW USER (NO HISTORY) + STANDARD ROTATION
  if (state.frequency === '0' || state.frequency === '1-2') {
    // 1-2 days: Full body -> Rest -> Mobility -> Full body rotation
    if (lastType === 'full') nextType = 'rest';
    else if (lastType === 'rest') nextType = 'mobility';
    else if (lastType === 'mobility') nextType = 'full';
    else nextType = 'full'; // default start for low freq
  } else if (state.frequency === '3-4') {
    // 3-4 days: Upper / Lower rotation
    if (lastType === 'upper' || lastType === 'upper_hypertrophy' || lastType === 'push' || lastType === 'pull') nextType = 'lower';
    else if (lastType === 'lower' || lastType === 'legs') nextType = 'cardio_core';
    else if (lastType === 'cardio_core' || lastType === 'cardio') nextType = 'upper';
    else if (lastType === 'rest') nextType = 'push';
    else nextType = 'push';
  } else if (state.frequency === '5+') {
    // 5+ days: High frequency rotation PPL + Upper + Cardio
    if (lastType === 'push') nextType = 'pull';
    else if (lastType === 'pull') nextType = 'legs';
    else if (lastType === 'legs') nextType = 'upper'; // Modified to actual upper
    else if (lastType === 'upper' || lastType === 'upper_hypertrophy') nextType = 'cardio_core';
    else if (lastType === 'cardio_core' || lastType === 'cardio') nextType = 'push'; // Skip mobility
    else if (lastType === 'mobility') nextType = 'push';
    else if (lastType === 'rest') nextType = 'push';
    else if (lastType === 'none') nextType = 'push';
    else nextType = 'push';
  } else {
    // Fallback or missed format (translates to 4-5 PPL)
    if (lastType === 'push') nextType = 'pull';
    else if (lastType === 'pull') nextType = 'legs';
    else if (lastType === 'legs') nextType = 'cardio_core';
    else if (lastType === 'cardio_core' || lastType === 'cardio') nextType = 'mobility';
    else if (lastType === 'mobility') nextType = 'push';
    else if (lastType === 'rest') nextType = 'push';
    else if (lastType === 'full') nextType = 'rest';
    else if (lastType === 'none') nextType = 'push';
    else nextType = 'push';
  }

  // ────────────────────────────────────
  // NEW FEATURE: Weekly Muscle Coverage Engine
  // ────────────────────────────────────
  const MAJOR_MUSCLES = ['chest', 'back', 'legs', 'shoulders'];
  let coverageReason = '';

  if (history.recentWorkouts && history.recentWorkouts.length > 0) {
    const trainedMuscles = new Set<string>();
    
    // Check over last 7 days
    history.recentWorkouts.forEach(w => {
      const daysAgo = getDaysDifference(today, normalizeDate(w.date));
      if (daysAgo <= 7) {
        getMuscleGroupsForType(w.type).forEach(m => trainedMuscles.add(m));
      }
    });

    const untrainedMajor = MAJOR_MUSCLES.filter(m => !trainedMuscles.has(m));
    
    // If a major muscle group is completely untrained in the last 7 days, override NEXT type
    if (untrainedMajor.length > 0) {
      if (untrainedMajor.length >= 3) {
         nextType = 'full';
      } else if (untrainedMajor.includes('legs')) {
         nextType = 'legs';
      } else if (untrainedMajor.includes('back')) {
         nextType = 'pull';
      } else {
         nextType = 'push';
      }
      coverageReason = `Targeting untrained muscles: ${untrainedMajor.join(', ')}`;
    }
  }

  // Edge case: Corrupted onboarding data safeguard
  let safeGoal = state.goal;
  if (!safeGoal) safeGoal = 'general_fitness';

  return {
    programIndex: getProgramIndexForType(nextType),
    workoutType: nextType,
    reason: coverageReason || (hasHistory ? (nextType === 'rest' ? 'Scheduled recovery day' : 'Based on your last session') : 'Based on onboarding profile'),
    recoveryOptimized: nextType === 'mobility' || nextType === 'rest',
    volumeModifier,
    uiLabel: GOAL_LABELS[safeGoal],
    uiSubLabel: coverageReason ? `Optimized coverage: ${nextType} focus` : (hasHistory ? 'Based on your last session' : 'Optimized for your profile'),
  };
}
