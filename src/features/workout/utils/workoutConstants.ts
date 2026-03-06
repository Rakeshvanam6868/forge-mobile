/**
 * Workout Mode Constants
 * Rest times, calorie estimates, and category mappings.
 */

// Default rest durations per exercise category (seconds)
export const REST_TIMES: Record<string, number> = {
  compound: 90,
  accessory: 60,
  isolation: 45,
  warmup: 30,
  core_cardio: 30,
  core: 30,
  cardio: 30,
  finisher: 30,
  primary: 60,
};

export const DEFAULT_REST_SECONDS = 60;

// Rough MET-based calorie estimation per minute for different categories
export const CALORIE_PER_MINUTE: Record<string, number> = {
  compound: 8,
  accessory: 6,
  isolation: 5,
  warmup: 3,
  core_cardio: 7,
  core: 5,
  cardio: 9,
  finisher: 7,
  primary: 6,
};

export const DEFAULT_CALORIE_PER_MINUTE = 6;

/**
 * Infer a category from exercise name heuristics when no explicit category exists.
 */
export function inferCategory(exerciseName: string): string {
  const name = exerciseName.toLowerCase();
  if (name.includes('stretch') || name.includes('warm') || name.includes('foam') || name.includes('cat-cow') || name.includes('mobility')) return 'warmup';
  if (name.includes('squat') || name.includes('press') || name.includes('deadlift') || name.includes('bench') || name.includes('row') || name.includes('pull-up') || name.includes('pullup')) return 'compound';
  if (name.includes('curl') || name.includes('extension') || name.includes('raise') || name.includes('fly') || name.includes('kickback')) return 'isolation';
  if (name.includes('plank') || name.includes('crunch') || name.includes('mountain') || name.includes('burpee') || name.includes('jump')) return 'core_cardio';
  return 'accessory';
}
