import { supabase } from '../../../core/supabase/client';
import { computeNextWorkout, UserTrainingState, UserWorkoutHistory, WorkoutType } from './adaptiveEntryEngine';
import { getExercises, PoolExercise, MuscleGroup, EXERCISE_POOL, MovementCategory } from '../data/exercisePools';

// ═══════════════════════════════════════════════
// Types & Rules
// ═══════════════════════════════════════════════

type FocusType = 'strength' | 'cardio' | 'mobility' | 'rest';
type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export type WorkoutTemplate = {
  exercise_name: string;
  exercise_id?: string;
  sets?: number;
  reps?: string;
  duration?: string;
  rest_sec?: number;
  category?: MovementCategory;
  muscle_groups?: MuscleGroup[];
};

type MealTemplate = {
  meal_type: MealType;
  title: string;
  description: string;
};

type DayTemplate = {
  title: string;
  focus_type: FocusType;
  workouts: WorkoutTemplate[];
  meals: MealTemplate[];
};

type GroceryItem = {
  category: 'protein' | 'carbs' | 'vegetables' | 'essentials';
  item_name: string;
};

// STRICT MUSCLE GROUP RULES (Deterministic Mapping)
const ALLOWED_MUSCLES: Record<string, MuscleGroup[]> = {
  push: ['chest', 'shoulders', 'triceps'],
  pull: ['back', 'biceps'],
  legs: ['legs'],
  lower: ['legs', 'core'],
  upper: ['chest', 'back', 'shoulders', 'triceps', 'biceps'],
  full: ['chest', 'back', 'legs', 'shoulders', 'triceps', 'biceps', 'core'],
  cardio_core: ['core', 'full_body'],
  mobility: ['mobility', 'full_body']
};

const FORBIDDEN_MUSCLES: Record<string, MuscleGroup[]> = {
  push: ['back', 'biceps', 'legs'],
  pull: ['chest', 'shoulders', 'triceps', 'legs'],
  legs: ['chest', 'back', 'shoulders', 'triceps', 'biceps'],
  lower: ['chest', 'back', 'shoulders', 'triceps', 'biceps'],
  upper: ['legs'],
};

// Equipment allowed per location — single source of truth
const LOCATION_EQUIPMENT: Record<string, Set<string>> = {
  home: new Set(['bodyweight', 'band']),
  gym: new Set(['bodyweight', 'dumbbell', 'barbell', 'machine', 'cable', 'band']),
};

// ═══════════════════════════════════════════════
// Core Engine: programGenerator
// ═══════════════════════════════════════════════

export const generateProgram = async (
  userId: string,
  goal: string,
  level: string,
  location: string,
  dietType: string
): Promise<{ program_id: string } | null> => {
  const { data: profile } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();

  const state: UserTrainingState = {
    level: (profile?.level || level || 'beginner').toLowerCase() as any,
    frequency: (profile?.weekly_frequency || '3-4') as any,
    lastWorkout: (profile?.last_workout_type || 'none') as any,
    goal: (profile?.goal || goal || 'general_fitness').toLowerCase() as any,
  };

  const { data: programRows, error: programError } = await supabase
    .from('programs')
    .insert({
      user_id: userId,
      goal: profile?.goal || goal,
      level: profile?.level || level,
      location: location || profile?.environment,
      diet_type: profile?.diet_type || dietType,
      duration_weeks: 4,
    })
    .select();

  if (programError) throw programError;
  const program = programRows[0];

  let currentHistory: UserWorkoutHistory = {};
  let globalDayCounter = 0;

  for (let w = 1; w <= 4; w++) {
    const { data: weekRows } = await supabase.from('program_weeks').insert({ program_id: program.id, week_number: w }).select();
    const week = weekRows![0];

    const dayTemplates = [];
    const dayInserts = [];

    for (let d = 0; d < 7; d++) {
      globalDayCounter++;
      const simulatedToday = new Date();
      simulatedToday.setDate(simulatedToday.getDate() + globalDayCounter);

      const nextOutput = computeNextWorkout(state, currentHistory, simulatedToday);
      currentHistory = {
        lastCompletedWorkoutType: nextOutput.workoutType,
        lastCompletionDate: new Date(simulatedToday.getTime() - 86400000).toISOString().split('T')[0],
      };

      const template = getTemplateForType(nextOutput.workoutType, state.level, location, state.goal);
      dayTemplates.push(template);
      dayInserts.push({
        program_week_id: week.id,
        day_number: d + 1,
        title: template.title,
        focus_type: template.focus_type,
      });
    }

    const { data: dayRows } = await supabase.from('program_days').insert(dayInserts).select();
    const sortedDays = dayRows!.sort((a, b) => a.day_number - b.day_number);

    let allWorkouts: any[] = [];
    let allMeals: any[] = [];

    for (let d = 0; d < 7; d++) {
      const day = sortedDays[d];
      const template = dayTemplates[d];

      allWorkouts.push(...template.workouts.map((w, i) => ({
        program_day_id: day.id,
        exercise_id: w.exercise_id,
        exercise_name: w.exercise_name,
        sets: w.sets,
        reps: w.reps,
        duration: w.duration,
        rest_sec: w.rest_sec,
        order_index: i,
      })));

      allMeals.push(...template.meals.map(m => ({
        program_day_id: day.id,
        meal_type: m.meal_type,
        title: m.title,
        description: m.description,
      })));
    }

    await supabase.from('day_workouts').insert(allWorkouts);
    await supabase.from('day_meals').insert(allMeals);

    const groceries = buildGroceryList(profile?.diet_type || dietType, profile?.goal || goal);
    await supabase.from('week_groceries').insert(groceries.map(g => ({ ...g, program_week_id: week.id })));
  }

  return { program_id: program.id };
};

// ═══════════════════════════════════════════════
// Deterministic Generation Logic
// ═══════════════════════════════════════════════

export function getTemplateForType(type: WorkoutType, level: string, location: string, goal: string): DayTemplate {
  const allowed = ALLOWED_MUSCLES[type] || ['mobility'];
  const forbidden = FORBIDDEN_MUSCLES[type] || [];
  const generated: WorkoutTemplate[] = [];
  const usedIds = new Set<string>();

  // 1. Build Pipeline (Warmup -> Compound -> Accessory -> Isolation -> Core/Cardio)
  const pipeline = [
    { cat: 'warmup', count: 1, muscles: allowed.concat(['mobility', 'full_body'] as MuscleGroup[]) },
    { cat: 'compound', count: level === 'beginner' ? 1 : 2, muscles: allowed },
    { cat: 'accessory', count: level === 'beginner' ? 1 : 2, muscles: allowed },
    { cat: 'isolation', count: level === 'advanced' ? 2 : 1, muscles: allowed },
    { cat: 'core_cardio', count: 1, muscles: ['core', 'full_body'] as MuscleGroup[] }
  ];

  for (const step of pipeline) {
    const pooled = getExercises(step.muscles, step.cat as MovementCategory, location, step.count, usedIds, forbidden);
    pooled.forEach(ex => {
      usedIds.add(ex.id);
      generated.push(adaptExercise(ex, level, goal));
    });
  }

  // 2. VALIDATION GATE — Remove any exercise that violates muscle or equipment rules
  const validated = validateAndCleanWorkout(generated, type, location);

  // 3. Final Formatting
  return {
    title: formatTitle(type),
    focus_type: deriveFocus(type),
    workouts: validated,
    meals: getDefaultMeals()
  };
}

// ADAPTATION LAYER
function adaptExercise(ex: PoolExercise, level: string, goal: string): WorkoutTemplate {
  let sets = ex.defaultSets || 3;
  let reps = ex.defaultReps || '10-12';
  let rest = ex.restSec ?? 60;

  if (level === 'advanced') sets += 1;
  if (goal === 'strength') {
    reps = '5-8';
    rest += 30;
  } else if (goal === 'fat_loss') {
    reps = '15-20';
    rest -= 15;
  }

  return {
    exercise_id: ex.id,
    exercise_name: ex.name,
    sets,
    reps,
    duration: ex.duration,
    rest_sec: Math.max(rest, 30),
    category: ex.category,
    muscle_groups: ex.muscleGroup
  };
}

// VALIDATION ENGINE — Rejects violations instead of logging them
function validateAndCleanWorkout(workouts: WorkoutTemplate[], type: string, location: string): WorkoutTemplate[] {
  const forbidden = new Set(FORBIDDEN_MUSCLES[type] || []);
  const normalizedLocation = location.toLowerCase();
  const allowedEquipment = LOCATION_EQUIPMENT[normalizedLocation] || LOCATION_EQUIPMENT['gym'];

  return workouts.filter(w => {
    // Gate 1: Muscle group violation — reject if ANY muscle is forbidden
    if (type !== 'rest' && type !== 'mobility' && type !== 'full') {
      const hasForbiddenMuscle = w.muscle_groups?.some(mg => forbidden.has(mg));
      if (hasForbiddenMuscle) {
        console.warn(`[ValidationGate] REJECTED ${w.exercise_name}: forbidden muscle in ${type} workout`);
        return false;
      }
    }

    // Gate 2: Equipment violation — reject if exercise has NO valid equipment for location
    if (w.exercise_id) {
      const poolEx = EXERCISE_POOL.find(p => p.id === w.exercise_id);
      if (poolEx) {
        const hasValidEquipment = poolEx.equipment.some(eq => allowedEquipment.has(eq));
        if (!hasValidEquipment) {
          console.warn(`[ValidationGate] REJECTED ${w.exercise_name}: equipment not valid for ${normalizedLocation}`);
          return false;
        }
      }
    }

    return true;
  });
}

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function formatTitle(type: string) {
  const map: any = { push: 'Push (Chest/Shoulders/Triceps)', pull: 'Pull (Back/Biceps)', legs: 'Legs (Lower Body)', upper: 'Upper Body Power', full: 'Full Body Integration' };
  return map[type] || 'Active Recovery';
}

function deriveFocus(type: string): FocusType {
  if (['rest', 'mobility'].includes(type)) return type as FocusType;
  if (['cardio', 'cardio_core'].includes(type)) return 'cardio';
  return 'strength';
}

function getDefaultMeals(): MealTemplate[] {
  return [
    { meal_type: 'breakfast', title: 'Power Porridge', description: 'Oats, protein scoop, berries.' },
    { meal_type: 'lunch', title: 'Lean Green Bowl', description: 'Protein, complex carbs, greens.' },
    { meal_type: 'snack', title: 'Fuel Bar', description: 'Protein bar or handful of nuts.' },
    { meal_type: 'dinner', title: 'Recovery Feast', description: 'Salmon/Tofu, sweet potato, broccoli.' }
  ];
}

function buildGroceryList(dietType: string, goal: string): GroceryItem[] {
  return [
    { category: 'protein', item_name: 'Chicken/Tofu' },
    { category: 'carbs', item_name: 'Quinoa/Rice' },
    { category: 'vegetables', item_name: 'Spinach/Broccoli' },
    { category: 'essentials', item_name: 'Olive Oil' }
  ];
}
