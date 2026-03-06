/**
 * useWorkoutSession — Orchestrator Hook
 *
 * Connects the Zustand store to the UI layer. Provides computed
 * convenience properties and navigation helpers.
 */

import { useMemo, useCallback } from 'react';
import { useWorkoutSessionStore, ExerciseLog, SetLog, WorkoutSummary } from '../stores/workoutSessionStore';
import { useRestTimer } from './useRestTimer';
import { AdaptedWorkout } from '../../program/services/adaptiveEngine';

export function useWorkoutSession() {
  const store = useWorkoutSessionStore();
  const restTimer = useRestTimer();

  // Current exercise
  const currentExercise: ExerciseLog | null = useMemo(() => {
    return store.exercises[store.currentExerciseIndex] ?? null;
  }, [store.exercises, store.currentExerciseIndex]);

  // Current set
  const currentSet: SetLog | null = useMemo(() => {
    return currentExercise?.sets[store.currentSetIndex] ?? null;
  }, [currentExercise, store.currentSetIndex]);

  // Is current exercise fully complete?
  const isCurrentExerciseComplete = useMemo(() => {
    if (!currentExercise) return false;
    return currentExercise.sets.every(s => s.completed);
  }, [currentExercise]);

  // Is this the last exercise?
  const isLastExercise = useMemo(() => {
    return store.currentExerciseIndex >= store.exercises.length - 1;
  }, [store.currentExerciseIndex, store.exercises.length]);

  // Is the entire workout complete?
  const isWorkoutComplete = useMemo(() => {
    return store.exercises.every(ex => ex.sets.every(s => s.completed));
  }, [store.exercises]);

  // Overall progress (0–1)
  const overallProgress = useMemo(() => {
    const totalSets = store.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
    if (totalSets === 0) return 0;
    const completedSets = store.exercises.reduce(
      (acc, ex) => acc + ex.sets.filter(s => s.completed).length,
      0
    );
    return completedSets / totalSets;
  }, [store.exercises]);

  // Elapsed time string
  const elapsedTime = useMemo(() => {
    if (!store.startTime) return '00:00';
    const ms = Date.now() - new Date(store.startTime).getTime();
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [store.startTime]);

  // Start session (with guard against double start)
  const start = useCallback((workouts: AdaptedWorkout[]) => {
    if (store.isActive) return;
    store.startSession(workouts);
  }, [store]);

  // Complete current set
  const completeCurrentSet = useCallback((weight: number | null, reps: number | null, duration: number | null) => {
    store.completeSet(weight, reps, duration);
  }, [store]);

  // Finish workout and return summary
  const finish = useCallback((): WorkoutSummary => {
    return store.finishWorkout();
  }, [store]);

  return {
    // State
    isActive: store.isActive,
    sessionId: store.sessionId,
    startTime: store.startTime,
    exercises: store.exercises,
    currentExerciseIndex: store.currentExerciseIndex,
    currentSetIndex: store.currentSetIndex,
    currentExercise,
    currentSet,

    // Computed
    isCurrentExerciseComplete,
    isLastExercise,
    isWorkoutComplete,
    overallProgress,
    elapsedTime,
    totalExercises: store.exercises.length,

    // Actions
    start,
    completeCurrentSet,
    editSet: store.editSet,
    nextExercise: store.nextExercise,
    previousExercise: store.previousExercise,
    finish,
    abandon: store.abandonWorkout,
    clearSession: store.clearSession,

    // Rest timer
    restTimer,
  };
}
