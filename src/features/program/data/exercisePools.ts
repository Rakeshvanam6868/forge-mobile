export type EquipmentType = 'bodyweight' | 'dumbbell' | 'barbell' | 'machine' | 'cable' | 'band';
export type MovementCategory = 'warmup' | 'compound' | 'accessory' | 'isolation' | 'core_cardio';
export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'legs' | 'core' | 'arms' | 'full_body' | 'mobility';

export interface PoolExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup[];
  category: MovementCategory;
  equipment: EquipmentType[];
  defaultSets?: number;
  defaultReps?: string;
  duration?: string;
}

export const EXERCISE_POOL: PoolExercise[] = [
  // ─── CHEST ──────────────────────────────────────────────────────────
  { id: 'ex-push-ups', name: 'Push-ups', muscleGroup: ['chest', 'shoulders'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '10-15' },
  { id: 'ex-db-bench-press', name: 'Dumbbell Bench Press', muscleGroup: ['chest'], category: 'compound', equipment: ['dumbbell'], defaultSets: 3, defaultReps: '8-12' },
  { id: 'ex-bb-bench-press', name: 'Barbell Bench Press', muscleGroup: ['chest'], category: 'compound', equipment: ['barbell'], defaultSets: 3, defaultReps: '6-10' },
  { id: 'ex-inc-db-press', name: 'Incline Dumbbell Press', muscleGroup: ['chest'], category: 'accessory', equipment: ['dumbbell'], defaultSets: 3, defaultReps: '10-12' },
  { id: 'ex-mach-chest-press', name: 'Machine Chest Press', muscleGroup: ['chest'], category: 'compound', equipment: ['machine'], defaultSets: 3, defaultReps: '10-12' },
  { id: 'ex-db-flyes', name: 'Dumbbell Flyes', muscleGroup: ['chest'], category: 'isolation', equipment: ['dumbbell'], defaultSets: 3, defaultReps: '12-15' },
  { id: 'ex-cable-cross', name: 'Cable Crossovers', muscleGroup: ['chest'], category: 'isolation', equipment: ['cable'], defaultSets: 3, defaultReps: '12-15' },
  { id: 'ex-band-chest-press', name: 'Resistance Band Chest Press', muscleGroup: ['chest'], category: 'compound', equipment: ['band'], defaultSets: 3, defaultReps: '15-20' },
  { id: 'ex-arm-circles', name: 'Arm Circles', muscleGroup: ['chest', 'shoulders', 'mobility'], category: 'warmup', equipment: ['bodyweight'], duration: '2 min' },

  // ─── BACK ────────────────────────────────────────────────────────────
  { id: 'ex-pull-ups', name: 'Pull-ups', muscleGroup: ['back', 'arms'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '5-10' },
  { id: 'ex-lat-pulldown', name: 'Lat Pulldown', muscleGroup: ['back'], category: 'compound', equipment: ['machine', 'cable'], defaultSets: 3, defaultReps: '10-12' },
  { id: 'ex-bb-row', name: 'Barbell Row', muscleGroup: ['back'], category: 'compound', equipment: ['barbell'], defaultSets: 3, defaultReps: '8-10' },
  { id: 'ex-db-row', name: 'Dumbbell Row', muscleGroup: ['back'], category: 'accessory', equipment: ['dumbbell'], defaultSets: 3, defaultReps: '10-12' },
  { id: 'ex-seated-cable-row', name: 'Seated Cable Row', muscleGroup: ['back'], category: 'accessory', equipment: ['cable', 'machine'], defaultSets: 3, defaultReps: '10-12' },
  { id: 'ex-straight-arm-pulldown', name: 'Straight Arm Pulldown', muscleGroup: ['back'], category: 'isolation', equipment: ['cable', 'band'], defaultSets: 3, defaultReps: '12-15' },
  { id: 'ex-superman-hold', name: 'Superman Hold', muscleGroup: ['back', 'core'], category: 'isolation', equipment: ['bodyweight'], defaultSets: 3, duration: '30s' },
  { id: 'ex-inverted-rows', name: 'Inverted Rows (Table)', muscleGroup: ['back'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '10-12' },
  { id: 'ex-cat-cow', name: 'Cat-Cow Stretch', muscleGroup: ['back', 'mobility'], category: 'warmup', equipment: ['bodyweight'], duration: '1 min' },

  // ─── SHOULDERS ───────────────────────────────────────────────────────
  { id: 'ex-overhead-press', name: 'Overhead Press', muscleGroup: ['shoulders'], category: 'compound', equipment: ['barbell', 'dumbbell'], defaultSets: 3, defaultReps: '8-10' },
  { id: 'ex-pike-pushups', name: 'Pike Push-ups', muscleGroup: ['shoulders'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '8-12' },
  { id: 'ex-lateral-raise', name: 'Lateral Raise', muscleGroup: ['shoulders'], category: 'isolation', equipment: ['dumbbell', 'cable', 'band'], defaultSets: 3, defaultReps: '12-15' },
  { id: 'ex-front-raise', name: 'Front Raise', muscleGroup: ['shoulders'], category: 'isolation', equipment: ['dumbbell', 'band'], defaultSets: 3, defaultReps: '12-15' },
  { id: 'ex-face-pulls', name: 'Face Pulls', muscleGroup: ['shoulders', 'back'], category: 'accessory', equipment: ['cable', 'band'], defaultSets: 3, defaultReps: '15-20' },
  { id: 'ex-mach-shoulder-press', name: 'Machine Shoulder Press', muscleGroup: ['shoulders'], category: 'compound', equipment: ['machine'], defaultSets: 3, defaultReps: '10-12' },
  { id: 'ex-shoulder-dislocations', name: 'Shoulder Dislocations (Broomstick)', muscleGroup: ['shoulders', 'mobility'], category: 'warmup', equipment: ['bodyweight'], duration: '2 min' },

  // ─── LEGS ────────────────────────────────────────────────────────────
  { id: 'ex-bb-squat', name: 'Barbell Squat', muscleGroup: ['legs'], category: 'compound', equipment: ['barbell'], defaultSets: 3, defaultReps: '6-10' },
  { id: 'ex-goblet-squat', name: 'Goblet Squat', muscleGroup: ['legs', 'core'], category: 'compound', equipment: ['dumbbell'], defaultSets: 3, defaultReps: '10-12' },
  { id: 'ex-bodyweight-squat', name: 'Bodyweight Squats', muscleGroup: ['legs'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '15-20' },
  { id: 'ex-leg-press', name: 'Leg Press', muscleGroup: ['legs'], category: 'compound', equipment: ['machine'], defaultSets: 3, defaultReps: '10-12' },
  { id: 'ex-rdl', name: 'Romanian Deadlift', muscleGroup: ['legs', 'back'], category: 'compound', equipment: ['barbell', 'dumbbell'], defaultSets: 3, defaultReps: '8-12' },
  { id: 'ex-lunges', name: 'Lunges', muscleGroup: ['legs'], category: 'accessory', equipment: ['bodyweight', 'dumbbell'], defaultSets: 3, defaultReps: '10-12 each' },
  { id: 'ex-leg-extensions', name: 'Leg Extensions', muscleGroup: ['legs'], category: 'isolation', equipment: ['machine'], defaultSets: 3, defaultReps: '12-15' },
  { id: 'ex-leg-curls', name: 'Leg Curls', muscleGroup: ['legs'], category: 'isolation', equipment: ['machine'], defaultSets: 3, defaultReps: '12-15' },
  { id: 'ex-calf-raises', name: 'Calf Raises', muscleGroup: ['legs'], category: 'isolation', equipment: ['bodyweight', 'dumbbell', 'machine'], defaultSets: 3, defaultReps: '15-20' },
  { id: 'ex-leg-swings', name: 'Leg Swings', muscleGroup: ['legs', 'mobility'], category: 'warmup', equipment: ['bodyweight'], duration: '2 min' },

  // ─── ARMS ────────────────────────────────────────────────────────────
  { id: 'ex-bicep-curls', name: 'Bicep Curls', muscleGroup: ['arms'], category: 'isolation', equipment: ['dumbbell', 'cable', 'band'], defaultSets: 3, defaultReps: '10-15' },
  { id: 'ex-hammer-curls', name: 'Hammer Curls', muscleGroup: ['arms'], category: 'isolation', equipment: ['dumbbell'], defaultSets: 3, defaultReps: '10-12' },
  { id: 'ex-tricep-pushdown', name: 'Tricep Pushdown', muscleGroup: ['arms'], category: 'isolation', equipment: ['cable', 'band'], defaultSets: 3, defaultReps: '12-15' },
  { id: 'ex-overhead-tricep-ext', name: 'Overhead Tricep Extension', muscleGroup: ['arms'], category: 'isolation', equipment: ['dumbbell', 'cable'], defaultSets: 3, defaultReps: '10-12' },
  { id: 'ex-tricep-dips', name: 'Tricep Dips', muscleGroup: ['arms'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '8-15' },

  // ─── CORE / CARDIO ───────────────────────────────────────────────────
  { id: 'ex-plank', name: 'Plank', muscleGroup: ['core'], category: 'core_cardio', equipment: ['bodyweight'], defaultSets: 3, duration: '45s' },
  { id: 'ex-bicycle-crunches', name: 'Bicycle Crunches', muscleGroup: ['core'], category: 'core_cardio', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '20' },
  { id: 'ex-leg-raises', name: 'Leg Raises', muscleGroup: ['core'], category: 'core_cardio', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '15' },
  { id: 'ex-treadmill-sprints', name: 'Treadmill Sprints', muscleGroup: ['full_body'], category: 'core_cardio', equipment: ['machine'], duration: '20 min' },
  { id: 'ex-burpees', name: 'Burpees', muscleGroup: ['full_body', 'core'], category: 'core_cardio', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '10' },
  { id: 'ex-jogging', name: 'Jogging', muscleGroup: ['legs'], category: 'core_cardio', equipment: ['bodyweight'], duration: '30 min' },
  { id: 'ex-elliptical', name: 'Elliptical', muscleGroup: ['full_body'], category: 'core_cardio', equipment: ['machine'], duration: '30 min' },

  // ─── MOBILITY / RECOVERY ─────────────────────────────────────────────
  { id: 'ex-yoga-flow', name: 'Yoga Flow', muscleGroup: ['mobility', 'full_body'], category: 'core_cardio', equipment: ['bodyweight'], duration: '15 min' },
  { id: 'ex-foam-rolling', name: 'Foam Rolling', muscleGroup: ['mobility'], category: 'core_cardio', equipment: ['bodyweight'], duration: '10 min' },
  { id: 'ex-deep-stretching', name: 'Deep Stretching', muscleGroup: ['mobility', 'full_body'], category: 'core_cardio', equipment: ['bodyweight'], duration: '10 min' },
  { id: 'ex-light-walking', name: 'Light Walking', muscleGroup: ['mobility', 'legs'], category: 'core_cardio', equipment: ['bodyweight'], duration: '20 min' }
];

export const getExercises = (
  muscleGroups: MuscleGroup[], 
  category: MovementCategory, 
  location: string, 
  count: number = 1
): PoolExercise[] => {
  const isHome = location.toLowerCase() === 'home';
  
  const validExercises = EXERCISE_POOL.filter(ex => {
    // Check muscle group match
    const matchesMuscleGroup = ex.muscleGroup.some(mg => muscleGroups.includes(mg));
    if (!matchesMuscleGroup) return false;
    
    // Check category match
    if (ex.category !== category) return false;
    
    // Check equipment constraint
    if (isHome) {
      const usesMachineOrCable = ex.equipment.some(eq => eq === 'machine' || eq === 'cable');
      // If it only has machines, exclude it
      if (usesMachineOrCable && !ex.equipment.some(eq => eq === 'bodyweight' || eq === 'dumbbell' || eq === 'band')) {
        return false;
      }
    }
    
    return true;
  });

  // Shuffle and return requested count
  return [...validExercises].sort(() => 0.5 - Math.random()).slice(0, count);
};
