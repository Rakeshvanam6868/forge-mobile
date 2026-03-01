import { supabase } from '../../../core/supabase/client';
import { computeNextWorkout, UserTrainingState, UserWorkoutHistory, WorkoutType } from './adaptiveEntryEngine';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

type FocusType = 'strength' | 'cardio' | 'mobility' | 'rest';
type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

type WorkoutTemplate = {
  exercise_name: string;
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
): Promise<void> => {
  // 1. Fetch real complete profile to get behavioral inputs
  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileErr) throw profileErr;

  // Build the deterministic state
  const state: UserTrainingState = {
    level: (profile.level || 'beginner').toLowerCase() as any,
    frequency: profile.weekly_frequency as any,
    lastWorkout: profile.last_workout_type as any,
    goal: (profile.goal || 'general_fitness').toLowerCase() as any,
  };

  // 2. Insert new program row
  const { data: program, error: programError } = await supabase
    .from('programs')
    .insert({
      user_id: userId,
      goal: profile.goal,
      level: profile.level,
      location: profile.environment,
      diet_type: profile.diet_type,
      duration_weeks: 4,
    })
    .select()
    .single();

  if (programError) throw programError;

  // Simulate 28 days of history chaining to generate exactly the right schedule
  let currentHistory: UserWorkoutHistory = {
    // For day 1, history is essentially empty so it uses state.lastWorkout
  };

  let globalDayCounter = 0;

  // 3. Generate 4 weeks
  for (let w = 1; w <= 4; w++) {
    const { data: week, error: weekError } = await supabase
      .from('program_weeks')
      .insert({ program_id: program.id, week_number: w })
      .select()
      .single();

    if (weekError) throw weekError;

    // 4. Generate 7 days per week sequentially
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

      const { data: day, error: dayError } = await supabase
        .from('program_days')
        .insert({
          program_week_id: week.id,
          day_number: d + 1,
          title: template.title,
          focus_type: template.focus_type,
        })
        .select()
        .single();

      if (dayError) throw dayError;

      // Insert workouts
      if (template.workouts.length > 0) {
        // Apply volume modifier
        const mult = nextOutput.volumeModifier === 'intense' ? 1.2 : nextOutput.volumeModifier === 'reduced' ? 0.8 : 1;
        
        const workoutRows = template.workouts.map((w, i) => ({
          program_day_id: day.id,
          exercise_name: w.exercise_name,
          sets: w.sets ? Math.max(1, Math.round(w.sets * mult)) : null,
          reps: w.reps ?? null,
          duration: w.duration ?? null,
          order_index: i,
        }));
        const { error: wErr } = await supabase.from('day_workouts').insert(workoutRows);
        if (wErr) throw wErr;
      }

      // Insert meals
      if (template.meals.length > 0) {
        const mealRows = template.meals.map((m) => ({
          program_day_id: day.id,
          meal_type: m.meal_type,
          title: m.title,
          description: m.description,
        }));
        const { error: mErr } = await supabase.from('day_meals').insert(mealRows);
        if (mErr) throw mErr;
      }
    }

    // 5. Insert grocery list
    const groceries = buildGroceryList(profile.diet_type || 'Any', profile.goal || 'General Fitness');
    const groceryRows = groceries.map((g) => ({
      program_week_id: week.id,
      category: g.category,
      item_name: g.item_name,
    }));
    const { error: gErr } = await supabase.from('week_groceries').insert(groceryRows);
    if (gErr) throw gErr;
  }
};

// ═══════════════════════════════════════════════
// Base Templates per Muscle Group (Adaptive blocks)
// ═══════════════════════════════════════════════

function getTemplateForType(type: WorkoutType, level: string, location: string, goal: string): DayTemplate {
  const isGym = location.toLowerCase() === 'gym';
  const isFatLoss = goal === 'fat_loss';
  const sets = level === 'advanced' ? 4 : 3;

  switch (type) {
    case 'push':
      return day('Push (Chest, Shoulders, Triceps)', 'strength', [
        { exercise_name: isGym ? 'Dumbbell Bench Press' : 'Push-ups', sets, reps: '12' },
        { exercise_name: isGym ? 'Overhead Press' : 'Pike Push-ups', sets, reps: '10' },
        { exercise_name: isGym ? 'Tricep Pushdown' : 'Tricep Dips', sets, reps: '12' },
        { exercise_name: isGym ? 'Lateral Raise' : 'Arm Circles', sets, reps: '15' },
      ]);
    case 'pull':
      return day('Pull (Back, Biceps)', 'strength', [
        { exercise_name: isGym ? 'Lat Pulldown' : 'Inverted Rows (Table)', sets, reps: '12' },
        { exercise_name: isGym ? 'Barbell Row' : 'Superman Hold', sets, reps: '10' },
        { exercise_name: isGym ? 'Bicep Curls' : 'Resistance Band Curls', sets, reps: '12' },
        { exercise_name: isGym ? 'Face Pulls' : 'Band Pull-aparts', sets, reps: '15' },
      ]);
    case 'legs':
      return day('Legs & Core', 'strength', [
        { exercise_name: isGym ? 'Barbell Squat' : 'Jump Squats', sets, reps: '12' },
        { exercise_name: isGym ? 'Leg Press' : 'Lunges', sets, reps: '12 each' },
        { exercise_name: isGym ? 'Romanian Deadlift' : 'Single Leg Glute Bridge', sets, reps: '10' },
        { exercise_name: 'Calf Raises', sets, reps: '20' },
      ]);
    case 'full':
      return day('Full Body', 'strength', [
        { exercise_name: isGym ? 'Goblet Squat' : 'Bodyweight Squats', sets, reps: '15' },
        { exercise_name: isGym ? 'Dumbbell Bench Press' : 'Push-ups', sets, reps: '12' },
        { exercise_name: isGym ? 'Lat Pulldown' : 'Superman Hold', sets, reps: '12' },
        { exercise_name: 'Plank', sets: 3, duration: '45s' },
      ]);
    case 'upper_hypertrophy':
      return day('Upper Body Muscle', 'strength', [
        { exercise_name: isGym ? 'Incline Dumbbell Press' : 'Decline Push-ups', sets, reps: '10' },
        { exercise_name: isGym ? 'Seated Cable Row' : 'Resistance Band Row', sets, reps: '12' },
        { exercise_name: isGym ? 'Dumbbell Flyes' : 'Wide Push-ups', sets, reps: '12' },
        { exercise_name: 'Hammer Curls', sets, reps: '12' },
      ]);
    case 'cardio_core':
    case 'cardio':
      return day(isFatLoss ? 'HIIT Cardio' : 'Steady State Cardio', 'cardio', [
        { exercise_name: isFatLoss ? (isGym ? 'Treadmill Sprints' : 'Burpees') : (isGym ? 'Elliptical' : 'Jogging'), duration: isFatLoss ? '20 min' : '30 min' },
        { exercise_name: 'Bicycle Crunches', sets: 3, reps: '20' },
        { exercise_name: 'Leg Raises', sets: 3, reps: '15' },
      ]);
    case 'mobility':
      return day('Flexibility & Mobility', 'mobility', [
        { exercise_name: 'Yoga Flow', duration: '15 min' },
        { exercise_name: 'Foam Rolling', duration: '10 min' },
        { exercise_name: 'Deep Stretching', duration: '10 min' },
      ]);
    case 'rest':
    case 'none':
    default:
      return day('Active Recovery', 'rest', [
        { exercise_name: 'Light Walking', duration: '20 min' },
        { exercise_name: 'Full Body Stretch', duration: '10 min' },
      ]);
  }
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
