/**
 * Workout Session Store — Zustand + AsyncStorage persistence
 *
 * Manages all live workout state: session lifecycle, exercise/set progression,
 * rest timer, and performance logging. Persists to AsyncStorage for crash recovery.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdaptedWorkout } from '../../program/services/adaptiveEngine';
import { REST_TIMES, DEFAULT_REST_SECONDS, MIN_SETS, DEFAULT_MIN_SETS, CALORIE_PER_MINUTE, DEFAULT_CALORIE_PER_MINUTE, inferCategory } from '../utils/workoutConstants';

// ═══════════════════════════════════════════════
// Data Models
// ═══════════════════════════════════════════════

export type SetLog = {
  setNumber: number;
  weight: number | null;
  reps: number | null;
  duration: number | null;
  completed: boolean;
  timestamp: string | null;
};

export type ExerciseLog = {
  exerciseId: string;
  exerciseName: string;
  category: string;
  targetSets: number;
  targetReps: string | null;
  targetDuration: string | null;
  sets: SetLog[];
};

export type WorkoutSummary = {
  sessionId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  exercisesCompleted: number;
  totalExercises: number;
  setsCompleted: number;
  totalVolume: number;
  estimatedCalories: number;
  exercises: ExerciseLog[];
};

// ═══════════════════════════════════════════════
// Store State
// ═══════════════════════════════════════════════

type WorkoutSessionState = {
  sessionId: string | null;
  isActive: boolean;
  startTime: string | null;
  endTime: string | null;
  currentExerciseIndex: number;
  currentSetIndex: number;
  exercises: ExerciseLog[];
  restTimerActive: boolean;
  restTimerEndTime: string | null;
  restTimerTotal: number;

  startSession: (workouts: AdaptedWorkout[]) => void;
  completeSet: (weight: number | null, reps: number | null, duration: number | null) => void;
  editSet: (exerciseIndex: number, setIndex: number, data: Partial<SetLog>) => void;
  nextExercise: () => void;
  previousExercise: () => void;
  startRestTimer: (seconds?: number) => void;
  skipRest: () => void;
  finishWorkout: () => WorkoutSummary;
  abandonWorkout: () => void;
  clearSession: () => void;
};

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function generateId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildExerciseLog(w: AdaptedWorkout): ExerciseLog {
  const category = inferCategory(w.exercise_name);
  const rawSets = w.adaptedSets ?? w.sets ?? 3;
  const minSets = MIN_SETS[category] ?? DEFAULT_MIN_SETS;
  const sets = Math.max(rawSets, minSets);

  const emptySetLogs: SetLog[] = Array.from({ length: sets }, (_, i) => ({
    setNumber: i + 1,
    weight: null,
    reps: null,
    duration: null,
    completed: false,
    timestamp: null,
  }));

  return {
    exerciseId: w.id || w.exercise_name,
    exerciseName: w.exercise_name,
    category,
    targetSets: sets,
    targetReps: w.adaptedReps ?? w.reps ?? null,
    targetDuration: w.duration ?? null,
    sets: emptySetLogs,
  };
}

// ═══════════════════════════════════════════════
// Store
// ═══════════════════════════════════════════════

export const useWorkoutSessionStore = create<WorkoutSessionState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      isActive: false,
      startTime: null,
      endTime: null,
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      exercises: [],
      restTimerActive: false,
      restTimerEndTime: null,
      restTimerTotal: 0,

      startSession: (workouts: AdaptedWorkout[]) => {
        const state = get();
        if (state.isActive) {
          console.warn('[WorkoutSession] Session already active, ignoring start.');
          return;
        }
        const exercises = workouts.map(buildExerciseLog);
        set({
          sessionId: generateId(),
          isActive: true,
          startTime: new Date().toISOString(),
          endTime: null,
          currentExerciseIndex: 0,
          currentSetIndex: 0,
          exercises,
          restTimerActive: false,
          restTimerEndTime: null,
          restTimerTotal: 0,
        });
      },

      completeSet: (weight, reps, duration) => {
        const state = get();
        if (!state.isActive) return;
        const { currentExerciseIndex, currentSetIndex, exercises } = state;
        const exercise = exercises[currentExerciseIndex];
        if (!exercise) return;

        const updatedSets = [...exercise.sets];
        updatedSets[currentSetIndex] = {
          ...updatedSets[currentSetIndex],
          weight, reps, duration,
          completed: true,
          timestamp: new Date().toISOString(),
        };

        const updatedExercises = [...exercises];
        updatedExercises[currentExerciseIndex] = { ...exercise, sets: updatedSets };

        const isLastSet = currentSetIndex >= exercise.targetSets - 1;
        const isLastExercise = currentExerciseIndex >= exercises.length - 1;
        const category = exercise.category;
        const restSeconds = REST_TIMES[category] ?? DEFAULT_REST_SECONDS;

        // Rest timer logic:
        // - After non-final set → rest, stay on same exercise
        // - After final set of non-last exercise → rest, then user navigates to next
        // - After final set of last exercise → no rest (workout done)
        const shouldStartRest = !(isLastSet && isLastExercise);
        const nextSetIndex = isLastSet ? currentSetIndex : currentSetIndex + 1;

        set({
          exercises: updatedExercises,
          currentSetIndex: nextSetIndex,
          ...(shouldStartRest ? {
            restTimerActive: true,
            restTimerEndTime: new Date(Date.now() + restSeconds * 1000).toISOString(),
            restTimerTotal: restSeconds,
          } : {
            restTimerActive: false,
            restTimerEndTime: null,
          }),
        });
      },

      editSet: (exerciseIndex, setIndex, data) => {
        const state = get();
        const exercises = [...state.exercises];
        const exercise = exercises[exerciseIndex];
        if (!exercise) return;
        const updatedSets = [...exercise.sets];
        updatedSets[setIndex] = { ...updatedSets[setIndex], ...data };
        exercises[exerciseIndex] = { ...exercise, sets: updatedSets };
        set({ exercises });
      },

      nextExercise: () => {
        const state = get();
        if (state.currentExerciseIndex < state.exercises.length - 1) {
          set({
            currentExerciseIndex: state.currentExerciseIndex + 1,
            currentSetIndex: 0,
            restTimerActive: false,
            restTimerEndTime: null,
          });
        }
      },

      previousExercise: () => {
        const state = get();
        if (state.currentExerciseIndex > 0) {
          set({
            currentExerciseIndex: state.currentExerciseIndex - 1,
            currentSetIndex: 0,
            restTimerActive: false,
            restTimerEndTime: null,
          });
        }
      },

      startRestTimer: (seconds?: number) => {
        const state = get();
        const exercise = state.exercises[state.currentExerciseIndex];
        const restSeconds = seconds ?? REST_TIMES[exercise?.category ?? ''] ?? DEFAULT_REST_SECONDS;
        set({
          restTimerActive: true,
          restTimerEndTime: new Date(Date.now() + restSeconds * 1000).toISOString(),
          restTimerTotal: restSeconds,
        });
      },

      skipRest: () => {
        set({ restTimerActive: false, restTimerEndTime: null });
      },

      finishWorkout: () => {
        const state = get();
        const endTime = new Date().toISOString();
        const startMs = state.startTime ? new Date(state.startTime).getTime() : Date.now();
        const durationMinutes = Math.round((Date.now() - startMs) / 60000);

        let setsCompleted = 0;
        let totalVolume = 0;
        let exercisesCompleted = 0;

        state.exercises.forEach(ex => {
          const completedSets = ex.sets.filter(s => s.completed);
          setsCompleted += completedSets.length;
          if (completedSets.length > 0) exercisesCompleted++;
          completedSets.forEach(s => {
            if (s.weight && s.reps) totalVolume += s.weight * s.reps;
          });
        });

        // Category-aware calorie estimation
        let estimatedCalories = 0;
        state.exercises.forEach(ex => {
          const completedSets = ex.sets.filter(s => s.completed);
          if (completedSets.length > 0) {
            const calPerMin = CALORIE_PER_MINUTE[ex.category] ?? DEFAULT_CALORIE_PER_MINUTE;
            // Estimate ~1.5 min per set for strength, ~2 min for cardio
            const minsPerSet = (ex.category === 'cardio' || ex.category === 'core_cardio') ? 2 : 1.5;
            estimatedCalories += Math.round(completedSets.length * minsPerSet * calPerMin);
          }
        });
        // Add rest time calories (~2 cal/min during rest)
        const restMinutes = Math.max(0, durationMinutes - state.exercises.reduce((acc, ex) => {
          const completedSets = ex.sets.filter(s => s.completed).length;
          const minsPerSet = (ex.category === 'cardio' || ex.category === 'core_cardio') ? 2 : 1.5;
          return acc + completedSets * minsPerSet;
        }, 0));
        estimatedCalories += Math.round(restMinutes * 2);

        const summary: WorkoutSummary = {
          sessionId: state.sessionId || generateId(),
          startTime: state.startTime || endTime,
          endTime,
          durationMinutes,
          exercisesCompleted,
          totalExercises: state.exercises.length,
          setsCompleted,
          totalVolume,
          estimatedCalories,
          exercises: state.exercises,
        };

        set({ isActive: false, endTime, restTimerActive: false, restTimerEndTime: null });
        return summary;
      },

      abandonWorkout: () => {
        set({
          sessionId: null, isActive: false, startTime: null, endTime: null,
          currentExerciseIndex: 0, currentSetIndex: 0, exercises: [],
          restTimerActive: false, restTimerEndTime: null, restTimerTotal: 0,
        });
      },

      clearSession: () => {
        set({
          sessionId: null, isActive: false, startTime: null, endTime: null,
          currentExerciseIndex: 0, currentSetIndex: 0, exercises: [],
          restTimerActive: false, restTimerEndTime: null, restTimerTotal: 0,
        });
      },
    }),
    {
      name: 'workout-session-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        sessionId: state.sessionId,
        isActive: state.isActive,
        startTime: state.startTime,
        endTime: state.endTime,
        currentExerciseIndex: state.currentExerciseIndex,
        currentSetIndex: state.currentSetIndex,
        exercises: state.exercises,
        restTimerEndTime: state.restTimerEndTime,
        restTimerTotal: state.restTimerTotal,
        restTimerActive: state.restTimerActive,
      }),
    }
  )
);
