import { supabase } from '../../../core/supabase/client';
import { computeNextWorkout, UserTrainingState, UserWorkoutHistory, WorkoutType } from './adaptiveEntryEngine';
import { getExercises, PoolExercise, MuscleGroup, EXERCISE_POOL } from '../data/exercisePools';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

type FocusType = 'strength' | 'cardio' | 'mobility' | 'rest';
type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

type WorkoutTemplate = {
  exercise_name: string;
  exercise_id?: string;
  sets?: number;
  reps?: string;
  duration?: string;
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

// ═══════════════════════════════════════════════
// Adaptive Program Generation
// ═══════════════════════════════════════════════

export const generateProgram = async (
  userId: string,
  goal: string,
  level: string,
  location: string,
  dietType: string
): Promise<{ program_id: string } | null> => {
  // 1. Try to fetch existing profile for behavioral inputs
  // During onboarding, the profile may not exist yet — fall back to function params
  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (profileErr) throw profileErr;

  // Build the deterministic state — prefer profile data, fall back to function params
  const state: UserTrainingState = {
    level: (profile?.level || level || 'beginner').toLowerCase() as any,
    frequency: (profile?.weekly_frequency || '3-4') as any,
    lastWorkout: (profile?.last_workout_type || 'none') as any,
    goal: (profile?.goal || goal || 'general_fitness').toLowerCase() as any,
  };

  // 2. Insert new program row
  // Use array extraction instead of .single() to avoid coercion error
  const { data: programRows, error: programError } = await supabase
    .from('programs')
    .insert({
      user_id: userId,
      goal: profile?.goal || goal,
      level: profile?.level || level,
      location: profile?.environment || location,
      diet_type: profile?.diet_type || dietType,
      duration_weeks: 4,
    })
    .select();

  if (programError) throw programError;
  const program = Array.isArray(programRows) ? programRows[0] : programRows;
  if (!program) throw new Error('Failed to create program');

  // Simulate 28 days of history chaining to generate exactly the right schedule
  let currentHistory: UserWorkoutHistory = {
    // For day 1, history is essentially empty so it uses state.lastWorkout
  };

  let globalDayCounter = 0;

  // 3. Generate 4 weeks
  for (let w = 1; w <= 4; w++) {
    // Use array extraction instead of .single() to prevent coercion error
    const { data: weekRows, error: weekError } = await supabase
      .from('program_weeks')
      .insert({ program_id: program.id, week_number: w })
      .select();

    if (weekError) throw weekError;
    const week = Array.isArray(weekRows) ? weekRows[0] : weekRows;
    if (!week) throw new Error(`Failed to create week ${w}`);

    // 4. Generate 7 days per week sequentially
    const dayInserts = [];
    const dayOutputs = [];
    const dayTemplates = [];

    for (let d = 0; d < 7; d++) {
      globalDayCounter++;

      // Pure function determines exact right workout based on sequence rules!
      // Provide a simulated date so the engine thinks 1 day has passed for history advancing
      const simulatedToday = new Date();
      simulatedToday.setDate(simulatedToday.getDate() + globalDayCounter);

      const nextOutput = computeNextWorkout(state, currentHistory, simulatedToday);
      
      // Update chain for next day
      currentHistory = {
        lastCompletedWorkoutType: nextOutput.workoutType,
        lastCompletionDate: new Date(simulatedToday.getTime() - 86400000).toISOString().split('T')[0], // Simulate we did it yesterday
      };

      // Get the correct template matching the deterministic output
      const template = getTemplateForType(nextOutput.workoutType, state.level, location, state.goal);

      dayOutputs.push(nextOutput);
      dayTemplates.push(template);

      dayInserts.push({
        program_week_id: week.id,
        day_number: d + 1,
        title: template.title,
        focus_type: template.focus_type,
      });
    }

    // Batch Insert 7 Days
    const { data: dayRows, error: dayError } = await supabase
      .from('program_days')
      .insert(dayInserts)
      .select();

    if (dayError) throw dayError;
    const sortedDays = (dayRows as any[]).sort((a, b) => a.day_number - b.day_number);

    let allWorkoutRows: any[] = [];
    let allMealRows: any[] = [];

    for (let d = 0; d < 7; d++) {
      const day = sortedDays[d];
      const template = dayTemplates[d];
      const nextOutput = dayOutputs[d];

      // Prepare workouts for batch
      if (template.workouts.length > 0) {
        // Apply volume modifier
        const mult = nextOutput.volumeModifier === 'intense' ? 1.2 : nextOutput.volumeModifier === 'reduced' ? 0.8 : 1;
        
        allWorkoutRows.push(...template.workouts.map((w: any, i: number) => ({
          program_day_id: day.id,
          exercise_name: w.exercise_name,
          sets: w.sets ? Math.max(1, Math.round(w.sets * mult)) : null,
          reps: w.reps ?? null,
          duration: w.duration ?? null,
          order_index: i,
        })));
      }

      // Prepare meals for batch
      if (template.meals.length > 0) {
        allMealRows.push(...template.meals.map((m: any) => ({
          program_day_id: day.id,
          meal_type: m.meal_type,
          title: m.title,
          description: m.description,
        })));
      }
    }

    // Batch Insert Workouts
    if (allWorkoutRows.length > 0) {
      const { error: wErr } = await supabase.from('day_workouts').insert(allWorkoutRows);
      if (wErr) throw wErr;
    }

    // Batch Insert Meals
    if (allMealRows.length > 0) {
      const { error: mErr } = await supabase.from('day_meals').insert(allMealRows);
      if (mErr) throw mErr;
    }

    // 5. Insert grocery list
    const groceries = buildGroceryList(profile?.diet_type || dietType || 'Any', profile?.goal || goal || 'General Fitness');
    const groceryRows = groceries.map((g) => ({
      program_week_id: week.id,
      category: g.category,
      item_name: g.item_name,
    }));
    const { error: gErr } = await supabase.from('week_groceries').insert(groceryRows);
    if (gErr) throw gErr;
  }

  // Return the program as a single JSON object (fixes coercion error)
  return { program_id: program.id };
};

// ═══════════════════════════════════════════════
// Base Templates per Muscle Group (Adaptive blocks)
// ═══════════════════════════════════════════════

function getTemplateForType(type: WorkoutType, level: string, location: string, goal: string): DayTemplate {
  const isFatLoss = goal === 'fat_loss';
  
  // Mapping WorkoutTypes to MuscleGroups
  let primaryMuscleGroups: MuscleGroup[] = [];
  let secondaryMuscleGroups: MuscleGroup[] = [];
  let title = '';
  let focus_type: FocusType = 'strength';

  switch (type) {
    case 'push':
      primaryMuscleGroups = ['chest', 'shoulders'];
      secondaryMuscleGroups = ['arms']; // Triceps fall under arms
      title = 'Push (Chest, Shoulders, Triceps)';
      break;
    case 'pull':
      primaryMuscleGroups = ['back'];
      secondaryMuscleGroups = ['arms']; // Biceps
      title = 'Pull (Back, Biceps)';
      break;
    case 'legs':
    case 'lower':
      primaryMuscleGroups = ['legs'];
      secondaryMuscleGroups = ['core'];
      title = type === 'lower' ? 'Lower Body & Core' : 'Legs & Core';
      break;
    case 'upper':
    case 'upper_hypertrophy':
      primaryMuscleGroups = ['chest', 'back', 'shoulders'];
      secondaryMuscleGroups = ['arms'];
      title = 'Upper Body Strength';
      break;
    case 'full':
      primaryMuscleGroups = ['chest', 'back', 'legs', 'shoulders'];
      secondaryMuscleGroups = ['core', 'arms'];
      title = 'Full Body';
      break;
    case 'cardio_core':
    case 'cardio':
      primaryMuscleGroups = ['core', 'full_body']; // For cardio options
      title = isFatLoss ? 'HIIT Cardio & Core' : 'Steady State Cardio & Core';
      focus_type = 'cardio';
      break;
    case 'mobility':
      primaryMuscleGroups = ['mobility'];
      title = 'Flexibility & Mobility';
      focus_type = 'mobility';
      break;
    case 'rest':
    case 'none':
    default:
      primaryMuscleGroups = ['mobility'];
      title = 'Active Recovery';
      focus_type = 'rest';
      break;
  }

  // Handle Cardio/Mobility/Rest dynamically but simpler
  if (focus_type !== 'strength') {
    const warmup = getExercises(primaryMuscleGroups, 'warmup', location, 1)[0] || getExercises(['mobility'] as MuscleGroup[], 'warmup', location, 1)[0];
    const core1 = getExercises(['core'] as MuscleGroup[], 'core_cardio', location, 1)[0];
    const core2 = getExercises(['core'] as MuscleGroup[], 'core_cardio', location, 2)[1];
    const cardio = getExercises(['full_body'] as MuscleGroup[], 'core_cardio', location, 1)[0];
    
    const workouts = [];
    if (warmup) workouts.push(formatEx(warmup, level));
    if (focus_type === 'cardio') {
      if (cardio) workouts.push(formatEx(cardio, level));
      if (core1) workouts.push(formatEx(core1, level));
      if (core2 && level === 'advanced') workouts.push(formatEx(core2, level));
    } else {
      // Mobility/Rest
      const stretch1 = getExercises(['mobility'] as MuscleGroup[], 'core_cardio', location, 1)[0];
      const stretch2 = getExercises(['mobility'] as MuscleGroup[], 'core_cardio', location, 2)[1];
      if (stretch1) workouts.push(formatEx(stretch1, level));
      if (stretch2) workouts.push(formatEx(stretch2, level));
    }
    return day(title, focus_type, workouts);
  }

  // STRUCTURAL LOGIC FOR STRENGTH (Warmup -> Compound -> Accessory -> Accessory -> Isolation -> Core/Cardio)
  // Ensure we fallback to 'full_body' group or 'mobility' if specific pulls fail
  const safePrimary = primaryMuscleGroups.length > 0 ? primaryMuscleGroups : (['full_body'] as MuscleGroup[]);
  const safeSecondary = secondaryMuscleGroups.length > 0 ? secondaryMuscleGroups : (['core'] as MuscleGroup[]);

  // 1. Warmup
  const warmupEx = getExercises(safePrimary.concat(['mobility'] as MuscleGroup[]), 'warmup', location, 1)[0] || EXERCISE_POOL.find((e: PoolExercise) => e.category === 'warmup')!;
  
  // 2. Compound
  const compoundEx = getExercises(safePrimary, 'compound', location, 1)[0] || getExercises(['full_body'] as MuscleGroup[], 'compound', location, 1)[0];
  
  // 3. Accessory 1
  const accessoryEx1 = getExercises(safePrimary, 'accessory', location, 1)[0] || getExercises(safePrimary, 'compound', location, 2)[1];
  
  // 4. Accessory 2 (From primary or secondary)
  let accessoryEx2 = getExercises(safeSecondary, 'accessory', location, 1)[0];
  if (!accessoryEx2 || accessoryEx2.name === accessoryEx1?.name) {
    accessoryEx2 = getExercises(safePrimary, 'isolation', location, 1)[0];
  }

  // 5. Isolation
  let isolationEx = getExercises(safeSecondary, 'isolation', location, 1)[0];
  if (!isolationEx || isolationEx.name === accessoryEx2?.name) {
      isolationEx = getExercises(safePrimary, 'isolation', location, 2)[1];
  }

  // 6. Optional Core
  const coreEx = getExercises(['core'] as MuscleGroup[], 'core_cardio', location, 1)[0];

  const generatedWorkouts: WorkoutTemplate[] = [];
  
  if (warmupEx) generatedWorkouts.push(formatEx(warmupEx, level));
  if (compoundEx) generatedWorkouts.push(formatEx(compoundEx, level));
  if (accessoryEx1) generatedWorkouts.push(formatEx(accessoryEx1, level));
  if (accessoryEx2) generatedWorkouts.push(formatEx(accessoryEx2, level));
  if (isolationEx) generatedWorkouts.push(formatEx(isolationEx, level));
  
  // Advanced gets extra core at the end
  if (coreEx && (level === 'advanced' || type === 'full' || type === 'legs' || type === 'lower')) {
    generatedWorkouts.push(formatEx(coreEx, level));
  }

  return day(title, focus_type, generatedWorkouts.filter(Boolean));
}

// Convert PoolExercise to WorkoutTemplate
function formatEx(ex: PoolExercise, level: string): WorkoutTemplate {
  let sets = ex.defaultSets;
  if (level === 'advanced' && sets && sets >= 3) {
      sets += 1;
  }
  return {
    exercise_id: ex.id,
    exercise_name: ex.name,
    sets: sets,
    reps: ex.defaultReps,
    duration: ex.duration,
  };
}

// ───── MEALS (shared) ─────
function getDefaultMeals(): MealTemplate[] {
  return [
    { meal_type: 'breakfast', title: 'Oats & Banana', description: 'Rolled oats with banana, honey & nuts. 350 cal.' },
    { meal_type: 'lunch', title: 'Rice & Dal Bowl', description: 'Brown rice, moong dal, mixed veggies, curd. 500 cal.' },
    { meal_type: 'snack', title: 'Fruit & Nuts', description: 'Apple or banana with 10 almonds. 200 cal.' },
    { meal_type: 'dinner', title: 'Roti & Sabzi', description: '2 multigrain rotis with paneer/chicken sabzi. 450 cal.' },
  ];
}

// ───── GROCERIES ─────
function buildGroceryList(dietType: string, goal: string): GroceryItem[] {
  const isVeg = dietType === 'Vegan' || dietType === 'Vegetarian';
  const protein: GroceryItem[] = isVeg
    ? [ { category: 'protein', item_name: 'Paneer (500g)' }, { category: 'protein', item_name: 'Moong Dal (500g)' }, { category: 'protein', item_name: 'Tofu (400g)' }, { category: 'protein', item_name: 'Greek Yogurt (500g)' } ]
    : [ { category: 'protein', item_name: 'Chicken Breast (1 kg)' }, { category: 'protein', item_name: 'Eggs (12)' }, { category: 'protein', item_name: 'Paneer (250g)' }, { category: 'protein', item_name: 'Fish/Prawns (500g)' } ];

  const carbs: GroceryItem[] = [ { category: 'carbs', item_name: 'Brown Rice (1 kg)' }, { category: 'carbs', item_name: 'Rolled Oats (500g)' }, { category: 'carbs', item_name: 'Multigrain Atta (1 kg)' }, { category: 'carbs', item_name: 'Sweet Potato (500g)' }, { category: 'carbs', item_name: 'Bananas (6)' } ];
  const vegetables: GroceryItem[] = [ { category: 'vegetables', item_name: 'Spinach (250g)' }, { category: 'vegetables', item_name: 'Broccoli (250g)' }, { category: 'vegetables', item_name: 'Mixed Bell Peppers (3)' }, { category: 'vegetables', item_name: 'Tomatoes (500g)' }, { category: 'vegetables', item_name: 'Onions (500g)' } ];
  const essentials: GroceryItem[] = [ { category: 'essentials', item_name: 'Olive Oil (500ml)' }, { category: 'essentials', item_name: 'Honey (250g)' }, { category: 'essentials', item_name: 'Almonds (200g)' }, { category: 'essentials', item_name: 'Peanut Butter (250g)' } ];

  return [...protein, ...carbs, ...vegetables, ...essentials];
}

// ───── Helper ─────
function day(title: string, focus_type: FocusType, workouts: WorkoutTemplate[]): DayTemplate {
  return { title, focus_type, workouts, meals: getDefaultMeals() };
}
