/**
 * Adaptive Engine — Phase 5
 *
 * PURE, DETERMINISTIC, SIDE-EFFECT FREE.
 * All adaptation is computed in-memory. Base program is NEVER mutated.
 */

import { Workout, Meal } from '../hooks/useDayDetail';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export type Difficulty = 'easy' | 'medium' | 'hard';

export type ExerciseHistoryRecord = {
  exercise_id: string;
  last_sets: number | null;
  last_reps: number | null;
  last_weight: number | null;
  difficulty: Difficulty;
};

export type AdaptiveInput = {
  focusType: string;       // strength | cardio | mobility | rest
  baseWorkouts: Workout[];
  baseMeals: Meal[];
  streak: number;
  energyTrend: number[];   // last 2 energy values (1=low, 2=avg, 3=high), newest first
  exerciseHistory: ExerciseHistoryRecord[];
  goal: string;            // 'Weight Loss' | 'Muscle Gain' | 'General Fitness'
  missedYesterday: boolean;
};

export type Intensity = 'low' | 'normal' | 'high';
export type Progression = 'none' | 'increase_reps' | 'increase_sets' | 'deload';
export type MealAdjustment = 'calorie_up' | 'calorie_down' | 'none';

export type AdaptivePlan = {
  intensity: Intensity;
  volumeMultiplier: number;
  progression: Progression;
  recoveryMode: boolean;
  mealAdjustment: MealAdjustment;
  systemMessage: string;
};

export type AdaptedWorkout = Workout & {
  adaptedSets: number | null;
  adaptedReps: string | null;
  isAdapted: boolean;
};

// ═══════════════════════════════════════════════
// Core Pure Function
// ═══════════════════════════════════════════════

export const computeAdaptivePlan = (input: AdaptiveInput): AdaptivePlan => {
  const { focusType, streak, energyTrend, exerciseHistory, goal, missedYesterday } = input;
  const isRestDay = focusType === 'rest' || focusType === 'mobility';

  // Defaults
  let intensity: Intensity = 'normal';
  let volumeMultiplier = 1.0;
  let progression: Progression = 'none';
  let recoveryMode = false;
  let mealAdjustment: MealAdjustment = 'none';
  let systemMessage = '';

  const lastEnergy = energyTrend[0] ?? 2;
  const secondLastEnergy = energyTrend[1] ?? 2;

  // ────────────────────────────────────
  // RULE 1: Recovery Mode (highest priority)
  // If last 2 energy logs are BOTH low → emergency deload
  // ────────────────────────────────────
  if (lastEnergy <= 1 && secondLastEnergy <= 1 && energyTrend.length >= 2) {
    recoveryMode = true;
    intensity = 'low';
    volumeMultiplier = 0.6;
    progression = 'deload';
    systemMessage = '🛡️ Recovery session activated — low energy detected over 2 days.';
  }

  // ────────────────────────────────────
  // RULE 2: Missed Yesterday → no progression
  // ────────────────────────────────────
  else if (missedYesterday) {
    intensity = 'normal';
    progression = 'none';
    volumeMultiplier = 1.0;
    systemMessage = '🔄 Welcome back! Keeping intensity steady today.';
  }

  // ────────────────────────────────────
  // RULE 3: High energy + streak ≥ 3 → push harder
  // ────────────────────────────────────
  else if (lastEnergy >= 3 && streak >= 3) {
    intensity = 'high';
    volumeMultiplier = 1.1;
    progression = 'increase_reps';
    systemMessage = '🔥 Great energy! Volume increased by 10% based on your streak.';
  }

  // ────────────────────────────────────
  // RULE 4: Streak ≥ 5 + energy not low → small overload
  // ────────────────────────────────────
  else if (streak >= 5 && lastEnergy >= 2) {
    intensity = 'normal';
    volumeMultiplier = 1.05;
    progression = 'increase_reps';
    systemMessage = '📈 5+ day streak! Volume boosted by 5%.';
  }

  // ────────────────────────────────────
  // RULE 5: Progressive overload from exercise history
  // ────────────────────────────────────
  else if (exerciseHistory.length > 0) {
    const avgDifficulty = getAverageDifficulty(exerciseHistory);

    if (avgDifficulty === 'easy') {
      progression = 'increase_reps';
      volumeMultiplier = 1.05;
      systemMessage = '💪 Last session felt easy — adding slight overload.';
    } else if (avgDifficulty === 'hard') {
      progression = 'deload';
      volumeMultiplier = 0.9;
      systemMessage = '⚖️ Last session was tough — reducing volume slightly.';
    } else {
      systemMessage = '✅ Staying on track with your program.';
    }
  }

  // ────────────────────────────────────
  // No history, no special conditions
  // ────────────────────────────────────
  else {
    systemMessage = '👋 Welcome! Follow the base plan — we\'ll adapt as you go.';
  }

  // ────────────────────────────────────
  // GOAL-BASED MEAL ADJUSTMENT
  // ────────────────────────────────────
  if (goal === 'Weight Loss') {
    mealAdjustment = isRestDay ? 'calorie_down' : 'none';
  } else if (goal === 'Muscle Gain') {
    mealAdjustment = intensity === 'high' ? 'calorie_up' : 'none';
  }

  // Rest days always low intensity (but don't override recovery message)
  if (isRestDay && !recoveryMode) {
    intensity = 'low';
    volumeMultiplier = 1.0;
    progression = 'none';
    if (!systemMessage) systemMessage = '🧘 Rest day — active recovery only.';
  }

  return {
    intensity,
    volumeMultiplier,
    progression,
    recoveryMode,
    mealAdjustment,
    systemMessage,
  };
};

// ═══════════════════════════════════════════════
// Apply Adaptation (in-memory only)
// ═══════════════════════════════════════════════

export const applyAdaptation = (
  baseWorkouts: Workout[],
  plan: AdaptivePlan
): AdaptedWorkout[] => {
  return baseWorkouts.map((w) => {
    let adaptedSets = w.sets;
    let adaptedReps = w.reps;
    let isAdapted = false;

    // Apply volume multiplier to sets
    if (adaptedSets && plan.volumeMultiplier !== 1.0) {
      adaptedSets = Math.max(1, Math.round(adaptedSets * plan.volumeMultiplier));
      if (adaptedSets !== w.sets) isAdapted = true;
    }

    // Apply rep progression
    if (adaptedReps && plan.progression === 'increase_reps') {
      const numericReps = parseInt(adaptedReps, 10);
      if (!isNaN(numericReps)) {
        const newReps = Math.round(numericReps * plan.volumeMultiplier);
        if (newReps !== numericReps) {
          adaptedReps = String(newReps);
          isAdapted = true;
        }
      }
    }

    // Deload: reduce reps
    if (adaptedReps && plan.progression === 'deload') {
      const numericReps = parseInt(adaptedReps, 10);
      if (!isNaN(numericReps)) {
        const newReps = Math.max(1, Math.round(numericReps * plan.volumeMultiplier));
        if (newReps !== numericReps) {
          adaptedReps = String(newReps);
          isAdapted = true;
        }
      }
    }

    return { ...w, adaptedSets, adaptedReps, isAdapted };
  });
};

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function getAverageDifficulty(history: ExerciseHistoryRecord[]): Difficulty {
  if (history.length === 0) return 'medium';

  const scores = history.map((h) =>
    h.difficulty === 'easy' ? 1 : h.difficulty === 'hard' ? 3 : 2
  );
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  if (avg <= 1.4) return 'easy';
  if (avg >= 2.6) return 'hard';
  return 'medium';
}
