/**
 * useWorkoutSession — Orchestrator Hook
 * Connects the Zustand store to the UI layer with computed convenience properties.
 */

import { useMemo, useCallback } from 'react';
import { useWorkoutSessionStore, ExerciseLog, SetLog, WorkoutSummary } from '../stores/workoutSessionStore';
import { useRestTimer } from './useRestTimer';
import { AdaptedWorkout } from '../../program/services/adaptiveEngine';
import { useUserProfile } from '../../onboarding/hooks/useUserProfile';

export function useWorkoutSession() {
  const store = useWorkoutSessionStore();
  const restTimer = useRestTimer();

  const currentExercise: ExerciseLog | null = useMemo(() => {
    return store.exercises[store.currentExerciseIndex] ?? null;
  }, [store.exercises, store.currentExerciseIndex]);

  const currentSet: SetLog | null = useMemo(() => {
    return currentExercise?.sets[store.currentSetIndex] ?? null;
  }, [currentExercise, store.currentSetIndex]);

  // Is current exercise fully complete (all sets done)?
  const isCurrentExerciseComplete = useMemo(() => {
    if (!currentExercise) return false;
    return currentExercise.sets.every(s => s.completed);
  }, [currentExercise]);

  const isLastExercise = useMemo(() => {
    return store.currentExerciseIndex >= store.exercises.length - 1;
  }, [store.currentExerciseIndex, store.exercises.length]);

  const isWorkoutComplete = useMemo(() => {
    return store.exercises.every(ex => ex.sets.every(s => s.completed));
  }, [store.exercises]);

  // Exercise-based progress (not set-based):
  // Progress increments when an exercise is FULLY completed
  const overallProgress = useMemo(() => {
    if (store.exercises.length === 0) return 0;
    const fullyCompleted = store.exercises.filter(ex => ex.sets.every(s => s.completed)).length;
    return fullyCompleted / store.exercises.length;
  }, [store.exercises]);

  // Next exercise preview (for rest timer overlay)
  const nextExercisePreview = useMemo(() => {
    const nextIdx = store.currentExerciseIndex + 1;
    if (nextIdx >= store.exercises.length) return null;
    const next = store.exercises[nextIdx];
    return {
      name: next.exerciseName,
      category: next.category,
      targetSets: next.targetSets,
      targetReps: next.targetReps,
      targetDuration: next.targetDuration,
    };
  }, [store.currentExerciseIndex, store.exercises]);

  const start = useCallback((workouts: AdaptedWorkout[]) => {
    if (store.isActive) return;
    store.startSession(workouts);
  }, [store]);

  const completeCurrentSet = useCallback((weight: number | null, reps: number | null, duration: number | null) => {
    store.completeSet(weight, reps, duration);
  }, [store]);

  const { profile } = useUserProfile();

  const finish = useCallback((): WorkoutSummary => {
    // Basic weight fallback if profile doesn't have it (assume 70kg as standard)
    // Adjust this logic if profile schema gains explicit weight property later
    const weightKg = (profile as any)?.weightKg ?? 70;
    return store.finishWorkout(weightKg);
  }, [store, profile]);

  return {
    isActive: store.isActive,
    sessionId: store.sessionId,
    startTime: store.startTime,
    exercises: store.exercises,
    currentExerciseIndex: store.currentExerciseIndex,
    currentSetIndex: store.currentSetIndex,
    currentExercise,
    currentSet,
    isCurrentExerciseComplete,
    isLastExercise,
    isWorkoutComplete,
    overallProgress,
    totalExercises: store.exercises.length,
    nextExercisePreview,
    start,
    completeCurrentSet,
    editSet: store.editSet,
    nextExercise: store.nextExercise,
    previousExercise: store.previousExercise,
    finish,
    abandon: store.abandonWorkout,
    clearSession: store.clearSession,
    pauseSession: store.pauseSession,
    resumeSession: store.resumeSession,
    pausedDurationMs: store.pausedDurationMs,
    restTimer,
  };
}
