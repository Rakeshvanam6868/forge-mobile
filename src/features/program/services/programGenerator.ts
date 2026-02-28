import { supabase } from '../../../core/supabase/client';

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
// Rule-based program generation
// ═══════════════════════════════════════════════

export const generateProgram = async (
  userId: string,
  goal: string,
  level: string,
  location: string,
  dietType: string
): Promise<void> => {
  // 1. Insert program row
  const { data: program, error: programError } = await supabase
    .from('programs')
    .insert({
      user_id: userId,
      goal,
      level,
      location,
      diet_type: dietType,
      duration_weeks: 4,
    })
    .select()
    .single();

  if (programError) throw programError;

  // 2. Generate 4 weeks
  for (let w = 1; w <= 4; w++) {
    const { data: week, error: weekError } = await supabase
      .from('program_weeks')
      .insert({ program_id: program.id, week_number: w })
      .select()
      .single();

    if (weekError) throw weekError;

    // 3. Generate 7 days per week
    const weekDays = buildWeekDays(goal, level, location, w);

    for (let d = 0; d < weekDays.length; d++) {
      const template = weekDays[d];

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

      // 4. Insert workouts
      if (template.workouts.length > 0) {
        const workoutRows = template.workouts.map((w, i) => ({
          program_day_id: day.id,
          exercise_name: w.exercise_name,
          sets: w.sets ?? null,
          reps: w.reps ?? null,
          duration: w.duration ?? null,
          order_index: i,
        }));
        const { error: wErr } = await supabase.from('day_workouts').insert(workoutRows);
        if (wErr) throw wErr;
      }

      // 5. Insert meals
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

    // 6. Insert grocery list
    const groceries = buildGroceryList(dietType, goal);
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
// Template builders
// ═══════════════════════════════════════════════

function buildWeekDays(
  goal: string,
  level: string,
  location: string,
  weekNumber: number
): DayTemplate[] {
  const isHome = location === 'Home';
  const isBeginner = level === 'Beginner';
  const isFatLoss = goal === 'Weight Loss';
  const isMuscle = goal === 'Muscle Gain';

  // Progressive overload: weeks 3-4 have slightly more volume
  const volumeMultiplier = weekNumber <= 2 ? 1 : 1.2;

  if (isBeginner && isHome) {
    return buildBeginnerHomePlan(isFatLoss, volumeMultiplier);
  }
  if (isBeginner && !isHome) {
    return buildBeginnerGymPlan(isFatLoss, volumeMultiplier);
  }
  if (!isBeginner && isHome) {
    return buildIntermediateHomePlan(isFatLoss, volumeMultiplier);
  }
  // Intermediate/Advanced + Gym
  return buildIntermediateGymPlan(isMuscle, volumeMultiplier);
}

// ───── BEGINNER HOME ─────
function buildBeginnerHomePlan(fatLoss: boolean, vol: number): DayTemplate[] {
  const sets = Math.round(3 * vol);
  return [
    day('Full Body Circuit', 'strength', [
      { exercise_name: 'Bodyweight Squats', sets, reps: '15' },
      { exercise_name: 'Push-ups (Knee)', sets, reps: '10' },
      { exercise_name: 'Glute Bridges', sets, reps: '15' },
      { exercise_name: 'Plank', sets: 3, duration: '30s' },
    ]),
    day(fatLoss ? 'HIIT Cardio' : 'Low Impact Cardio', 'cardio', [
      { exercise_name: fatLoss ? 'Jumping Jacks' : 'Marching in Place', duration: '30s', sets, reps: '—' },
      { exercise_name: fatLoss ? 'High Knees' : 'Step Touch', duration: '30s', sets, reps: '—' },
      { exercise_name: fatLoss ? 'Burpees' : 'Arm Circles', duration: '30s', sets, reps: '—' },
      { exercise_name: 'Mountain Climbers', duration: '30s', sets, reps: '—' },
    ]),
    day('Active Recovery', 'rest', [
      { exercise_name: 'Light Walking', duration: '20 min' },
      { exercise_name: 'Full Body Stretch', duration: '10 min' },
    ]),
    day('Upper Body Focus', 'strength', [
      { exercise_name: 'Push-ups', sets, reps: '12' },
      { exercise_name: 'Tricep Dips (Chair)', sets, reps: '10' },
      { exercise_name: 'Superman Hold', sets, reps: '12' },
      { exercise_name: 'Arm Circles', sets: 2, duration: '30s' },
    ]),
    day('Lower Body Focus', 'strength', [
      { exercise_name: 'Lunges', sets, reps: '12 each leg' },
      { exercise_name: 'Calf Raises', sets, reps: '20' },
      { exercise_name: 'Wall Sit', sets: 3, duration: '30s' },
      { exercise_name: 'Single Leg Glute Bridge', sets, reps: '10 each' },
    ]),
    day('Flexibility & Mobility', 'mobility', [
      { exercise_name: 'Yoga Flow', duration: '15 min' },
      { exercise_name: 'Hip Opener Stretch', duration: '5 min' },
      { exercise_name: 'Foam Rolling', duration: '10 min' },
    ]),
    day('Rest Day', 'rest', [
      { exercise_name: 'Complete rest or light walk', duration: '20 min' },
    ]),
  ].map((d) => ({ ...d, meals: getDefaultMeals() }));
}

// ───── BEGINNER GYM ─────
function buildBeginnerGymPlan(fatLoss: boolean, vol: number): DayTemplate[] {
  const sets = Math.round(3 * vol);
  return [
    day('Full Body A', 'strength', [
      { exercise_name: 'Goblet Squat', sets, reps: '12' },
      { exercise_name: 'Lat Pulldown', sets, reps: '12' },
      { exercise_name: 'Dumbbell Bench Press', sets, reps: '10' },
      { exercise_name: 'Cable Row', sets, reps: '12' },
    ]),
    day(fatLoss ? 'Cardio Intervals' : 'Steady State Cardio', 'cardio', [
      { exercise_name: fatLoss ? 'Treadmill Intervals' : 'Elliptical', duration: '25 min' },
      { exercise_name: 'Core Circuit', sets: 3, reps: '15' },
    ]),
    day('Active Recovery', 'rest', [
      { exercise_name: 'Light Cycling', duration: '15 min' },
      { exercise_name: 'Stretching', duration: '15 min' },
    ]),
    day('Full Body B', 'strength', [
      { exercise_name: 'Leg Press', sets, reps: '12' },
      { exercise_name: 'Overhead Press', sets, reps: '10' },
      { exercise_name: 'Seated Row', sets, reps: '12' },
      { exercise_name: 'Leg Curl', sets, reps: '12' },
    ]),
    day('Upper Body', 'strength', [
      { exercise_name: 'Chest Fly Machine', sets, reps: '12' },
      { exercise_name: 'Bicep Curl', sets, reps: '12' },
      { exercise_name: 'Tricep Pushdown', sets, reps: '12' },
      { exercise_name: 'Lateral Raise', sets, reps: '12' },
    ]),
    day('Mobility', 'mobility', [
      { exercise_name: 'Foam Rolling', duration: '10 min' },
      { exercise_name: 'Yoga Flow', duration: '20 min' },
    ]),
    day('Rest Day', 'rest', [
      { exercise_name: 'Complete rest', duration: '—' },
    ]),
  ].map((d) => ({ ...d, meals: getDefaultMeals() }));
}

// ───── INTERMEDIATE HOME ─────
function buildIntermediateHomePlan(fatLoss: boolean, vol: number): DayTemplate[] {
  const sets = Math.round(4 * vol);
  return [
    day('Upper Push', 'strength', [
      { exercise_name: 'Diamond Push-ups', sets, reps: '15' },
      { exercise_name: 'Pike Push-ups', sets, reps: '10' },
      { exercise_name: 'Decline Push-ups', sets, reps: '12' },
      { exercise_name: 'Tricep Dips', sets, reps: '12' },
    ]),
    day('Lower Body Power', 'strength', [
      { exercise_name: 'Jump Squats', sets, reps: '15' },
      { exercise_name: 'Bulgarian Split Squats', sets, reps: '12 each' },
      { exercise_name: 'Single Leg Deadlift', sets, reps: '10 each' },
      { exercise_name: 'Calf Raises', sets, reps: '20' },
    ]),
    day(fatLoss ? 'HIIT Tabata' : 'Steady Cardio', 'cardio', [
      { exercise_name: fatLoss ? 'Tabata Burpees' : 'Jogging', duration: fatLoss ? '20 min' : '30 min' },
      { exercise_name: 'Plank Series', sets: 3, duration: '45s' },
    ]),
    day('Upper Pull', 'strength', [
      { exercise_name: 'Inverted Rows (Table)', sets, reps: '12' },
      { exercise_name: 'Resistance Band Pull-apart', sets, reps: '15' },
      { exercise_name: 'Superman', sets, reps: '15' },
      { exercise_name: 'Bicep Curl (Band)', sets, reps: '12' },
    ]),
    day('Core & Conditioning', 'strength', [
      { exercise_name: 'Bicycle Crunches', sets, reps: '20' },
      { exercise_name: 'Leg Raises', sets, reps: '15' },
      { exercise_name: 'Russian Twists', sets, reps: '20' },
      { exercise_name: 'Dead Bug', sets, reps: '12 each' },
    ]),
    day('Mobility', 'mobility', [
      { exercise_name: 'Dynamic Stretching', duration: '15 min' },
      { exercise_name: 'Foam Rolling', duration: '10 min' },
    ]),
    day('Rest Day', 'rest', [
      { exercise_name: 'Complete rest or light walk', duration: '20 min' },
    ]),
  ].map((d) => ({ ...d, meals: getDefaultMeals() }));
}

// ───── INTERMEDIATE/ADVANCED GYM ─────
function buildIntermediateGymPlan(muscle: boolean, vol: number): DayTemplate[] {
  const sets = Math.round(4 * vol);
  return [
    day('Push Day', 'strength', [
      { exercise_name: 'Barbell Bench Press', sets, reps: muscle ? '8' : '12' },
      { exercise_name: 'Incline Dumbbell Press', sets, reps: '10' },
      { exercise_name: 'Overhead Press', sets, reps: '10' },
      { exercise_name: 'Cable Fly', sets, reps: '12' },
      { exercise_name: 'Tricep Rope Pushdown', sets, reps: '12' },
    ]),
    day('Pull Day', 'strength', [
      { exercise_name: 'Deadlift', sets, reps: muscle ? '5' : '10' },
      { exercise_name: 'Barbell Row', sets, reps: '10' },
      { exercise_name: 'Lat Pulldown', sets, reps: '12' },
      { exercise_name: 'Face Pull', sets, reps: '15' },
      { exercise_name: 'Barbell Curl', sets, reps: '12' },
    ]),
    day('Legs', 'strength', [
      { exercise_name: 'Barbell Squat', sets, reps: muscle ? '6' : '10' },
      { exercise_name: 'Romanian Deadlift', sets, reps: '10' },
      { exercise_name: 'Leg Press', sets, reps: '12' },
      { exercise_name: 'Leg Curl', sets, reps: '12' },
      { exercise_name: 'Calf Raise Machine', sets, reps: '15' },
    ]),
    day('Cardio & Core', 'cardio', [
      { exercise_name: muscle ? 'Low Intensity Walk (Incline)' : 'HIIT Sprints', duration: '25 min' },
      { exercise_name: 'Hanging Leg Raise', sets: 3, reps: '12' },
      { exercise_name: 'Cable Woodchop', sets: 3, reps: '12 each' },
    ]),
    day('Upper Hypertrophy', 'strength', [
      { exercise_name: 'Dumbbell Shoulder Press', sets, reps: '12' },
      { exercise_name: 'Chest Dips', sets, reps: '10' },
      { exercise_name: 'Cable Row', sets, reps: '12' },
      { exercise_name: 'Lateral Raise', sets, reps: '15' },
      { exercise_name: 'Hammer Curl', sets, reps: '12' },
    ]),
    day('Mobility & Recovery', 'mobility', [
      { exercise_name: 'Yoga Flow', duration: '20 min' },
      { exercise_name: 'Foam Rolling', duration: '15 min' },
    ]),
    day('Rest Day', 'rest', [
      { exercise_name: 'Complete rest', duration: '—' },
    ]),
  ].map((d) => ({ ...d, meals: getDefaultMeals() }));
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
    ? [
        { category: 'protein', item_name: 'Paneer (500g)' },
        { category: 'protein', item_name: 'Moong Dal (500g)' },
        { category: 'protein', item_name: 'Chana (500g)' },
        { category: 'protein', item_name: 'Tofu (400g)' },
        { category: 'protein', item_name: 'Greek Yogurt (500g)' },
      ]
    : [
        { category: 'protein', item_name: 'Chicken Breast (1 kg)' },
        { category: 'protein', item_name: 'Eggs (12)' },
        { category: 'protein', item_name: 'Moong Dal (500g)' },
        { category: 'protein', item_name: 'Paneer (250g)' },
        { category: 'protein', item_name: 'Fish/Prawns (500g)' },
      ];

  const carbs: GroceryItem[] = [
    { category: 'carbs', item_name: 'Brown Rice (1 kg)' },
    { category: 'carbs', item_name: 'Rolled Oats (500g)' },
    { category: 'carbs', item_name: 'Multigrain Atta (1 kg)' },
    { category: 'carbs', item_name: 'Sweet Potato (500g)' },
    { category: 'carbs', item_name: 'Bananas (6)' },
  ];

  const vegetables: GroceryItem[] = [
    { category: 'vegetables', item_name: 'Spinach (250g)' },
    { category: 'vegetables', item_name: 'Broccoli (250g)' },
    { category: 'vegetables', item_name: 'Mixed Bell Peppers (3)' },
    { category: 'vegetables', item_name: 'Cucumber (2)' },
    { category: 'vegetables', item_name: 'Tomatoes (500g)' },
    { category: 'vegetables', item_name: 'Onions (500g)' },
  ];

  const essentials: GroceryItem[] = [
    { category: 'essentials', item_name: 'Olive Oil (500ml)' },
    { category: 'essentials', item_name: 'Honey (250g)' },
    { category: 'essentials', item_name: 'Almonds (200g)' },
    { category: 'essentials', item_name: 'Peanut Butter (250g)' },
    { category: 'essentials', item_name: 'Green Tea (25 bags)' },
  ];

  return [...protein, ...carbs, ...vegetables, ...essentials];
}

// ───── Helper ─────
function day(title: string, focus_type: FocusType, workouts: WorkoutTemplate[]): Omit<DayTemplate, 'meals'> {
  return { title, focus_type, workouts };
}
