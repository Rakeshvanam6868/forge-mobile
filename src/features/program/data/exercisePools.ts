export type EquipmentType = 'bodyweight' | 'dumbbell' | 'barbell' | 'machine' | 'cable' | 'band';
export type MovementCategory = 'warmup' | 'compound' | 'accessory' | 'isolation' | 'core_cardio';
export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'legs' | 'core' | 'full_body' | 'mobility' | 'biceps' | 'triceps';

export interface PoolExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup[];
  category: MovementCategory;
  equipment: EquipmentType[];
  defaultSets?: number;
  defaultReps?: string;
  duration?: string;
  restSec?: number;
}

export const EXERCISE_POOL: PoolExercise[] = [
  // ─── CHEST ──────────────────────────────────────────────────────────
  { id: 'ex-push-ups', name: 'Push-ups', muscleGroup: ['chest', 'shoulders'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '10-15', restSec: 60 },
  { id: 'ex-db-bench-press', name: 'Dumbbell Bench Press', muscleGroup: ['chest'], category: 'compound', equipment: ['dumbbell'], defaultSets: 3, defaultReps: '8-12', restSec: 90 },
  { id: 'ex-bb-bench-press', name: 'Barbell Bench Press', muscleGroup: ['chest'], category: 'compound', equipment: ['barbell'], defaultSets: 3, defaultReps: '6-10', restSec: 120 },
  { id: 'ex-inc-db-press', name: 'Incline Dumbbell Press', muscleGroup: ['chest'], category: 'accessory', equipment: ['dumbbell'], defaultSets: 3, defaultReps: '10-12', restSec: 60 },
  { id: 'ex-mach-chest-press', name: 'Machine Chest Press', muscleGroup: ['chest'], category: 'compound', equipment: ['machine'], defaultSets: 3, defaultReps: '10-12', restSec: 90 },
  { id: 'ex-db-flyes', name: 'Dumbbell Flyes', muscleGroup: ['chest'], category: 'isolation', equipment: ['dumbbell'], defaultSets: 3, defaultReps: '12-15', restSec: 60 },
  { id: 'ex-cable-cross', name: 'Cable Crossovers', muscleGroup: ['chest'], category: 'isolation', equipment: ['cable'], defaultSets: 3, defaultReps: '12-15', restSec: 60 },
  { id: 'ex-band-chest-press', name: 'Resistance Band Chest Press', muscleGroup: ['chest'], category: 'compound', equipment: ['band'], defaultSets: 3, defaultReps: '15-20', restSec: 60 },
  { id: 'ex-arm-circles', name: 'Arm Circles', muscleGroup: ['chest', 'shoulders', 'mobility'], category: 'warmup', equipment: ['bodyweight'], duration: '2 min', restSec: 0 },

  // ─── BACK ────────────────────────────────────────────────────────────
  { id: 'ex-pull-ups', name: 'Pull-ups', muscleGroup: ['back', 'biceps'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '5-10', restSec: 90 },
  { id: 'ex-lat-pulldown', name: 'Lat Pulldown', muscleGroup: ['back'], category: 'compound', equipment: ['machine', 'cable'], defaultSets: 3, defaultReps: '10-12', restSec: 90 },
  { id: 'ex-bb-row', name: 'Barbell Row', muscleGroup: ['back'], category: 'compound', equipment: ['barbell'], defaultSets: 3, defaultReps: '8-10', restSec: 120 },
  { id: 'ex-db-row', name: 'Dumbbell Row', muscleGroup: ['back'], category: 'accessory', equipment: ['dumbbell'], defaultSets: 3, defaultReps: '10-12', restSec: 60 },
  { id: 'ex-seated-cable-row', name: 'Seated Cable Row', muscleGroup: ['back'], category: 'accessory', equipment: ['cable', 'machine'], defaultSets: 3, defaultReps: '10-12', restSec: 60 },
  { id: 'ex-straight-arm-pulldown', name: 'Straight Arm Pulldown', muscleGroup: ['back'], category: 'isolation', equipment: ['cable', 'band'], defaultSets: 3, defaultReps: '12-15', restSec: 45 },
  { id: 'ex-superman-hold', name: 'Superman Hold', muscleGroup: ['back', 'core'], category: 'isolation', equipment: ['bodyweight'], defaultSets: 3, duration: '30s', restSec: 45 },
  { id: 'ex-inverted-rows', name: 'Inverted Rows (Table)', muscleGroup: ['back'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '10-12', restSec: 90 },
  { id: 'ex-cat-cow', name: 'Cat-Cow Stretch', muscleGroup: ['back', 'mobility'], category: 'warmup', equipment: ['bodyweight'], duration: '1 min', restSec: 0 },

  // ─── SHOULDERS ───────────────────────────────────────────────────────
  { id: 'ex-overhead-press', name: 'Overhead Press', muscleGroup: ['shoulders'], category: 'compound', equipment: ['barbell', 'dumbbell'], defaultSets: 3, defaultReps: '8-10', restSec: 90 },
  { id: 'ex-pike-pushups', name: 'Pike Push-ups', muscleGroup: ['shoulders'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '8-12', restSec: 60 },
  { id: 'ex-lateral-raise', name: 'Lateral Raise', muscleGroup: ['shoulders'], category: 'isolation', equipment: ['dumbbell', 'cable', 'band'], defaultSets: 3, defaultReps: '12-15', restSec: 45 },
  { id: 'ex-front-raise', name: 'Front Raise', muscleGroup: ['shoulders'], category: 'isolation', equipment: ['dumbbell', 'band'], defaultSets: 3, defaultReps: '12-15', restSec: 45 },
  { id: 'ex-face-pulls', name: 'Face Pulls', muscleGroup: ['shoulders', 'back'], category: 'accessory', equipment: ['cable', 'band'], defaultSets: 3, defaultReps: '15-20', restSec: 60 },
  { id: 'ex-mach-shoulder-press', name: 'Machine Shoulder Press', muscleGroup: ['shoulders'], category: 'compound', equipment: ['machine'], defaultSets: 3, defaultReps: '10-12', restSec: 90 },
  { id: 'ex-shoulder-dislocations', name: 'Shoulder Dislocations (Broomstick)', muscleGroup: ['shoulders', 'mobility'], category: 'warmup', equipment: ['bodyweight'], duration: '2 min', restSec: 0 },

  // ─── LEGS ────────────────────────────────────────────────────────────
  { id: 'ex-bb-squat', name: 'Barbell Squat', muscleGroup: ['legs'], category: 'compound', equipment: ['barbell'], defaultSets: 3, defaultReps: '6-10', restSec: 120 },
  { id: 'ex-goblet-squat', name: 'Goblet Squat', muscleGroup: ['legs', 'core'], category: 'compound', equipment: ['dumbbell'], defaultSets: 3, defaultReps: '10-12', restSec: 90 },
  { id: 'ex-bodyweight-squat', name: 'Bodyweight Squats', muscleGroup: ['legs'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '15-20', restSec: 60 },
  { id: 'ex-leg-press', name: 'Leg Press', muscleGroup: ['legs'], category: 'compound', equipment: ['machine'], defaultSets: 3, defaultReps: '10-12', restSec: 90 },
  { id: 'ex-rdl', name: 'Romanian Deadlift', muscleGroup: ['legs', 'back'], category: 'compound', equipment: ['barbell', 'dumbbell'], defaultSets: 3, defaultReps: '8-12', restSec: 90 },
  { id: 'ex-lunges', name: 'Lunges', muscleGroup: ['legs'], category: 'accessory', equipment: ['bodyweight', 'dumbbell'], defaultSets: 3, defaultReps: '10-12 each', restSec: 60 },
  { id: 'ex-leg-extensions', name: 'Leg Extensions', muscleGroup: ['legs'], category: 'isolation', equipment: ['machine'], defaultSets: 3, defaultReps: '12-15', restSec: 45 },
  { id: 'ex-leg-curls', name: 'Leg Curls', muscleGroup: ['legs'], category: 'isolation', equipment: ['machine'], defaultSets: 3, defaultReps: '12-15', restSec: 45 },
  { id: 'ex-calf-raises', name: 'Calf Raises', muscleGroup: ['legs'], category: 'isolation', equipment: ['bodyweight', 'dumbbell', 'machine'], defaultSets: 3, defaultReps: '15-20', restSec: 45 },
  { id: 'ex-leg-swings', name: 'Leg Swings', muscleGroup: ['legs', 'mobility'], category: 'warmup', equipment: ['bodyweight'], duration: '2 min', restSec: 0 },

  // ─── ARMS ────────────────────────────────────────────────────────────
  { id: 'ex-bicep-curls', name: 'Bicep Curls', muscleGroup: ['biceps'], category: 'isolation', equipment: ['dumbbell', 'cable', 'band'], defaultSets: 3, defaultReps: '10-15', restSec: 45 },
  { id: 'ex-hammer-curls', name: 'Hammer Curls', muscleGroup: ['biceps'], category: 'isolation', equipment: ['dumbbell'], defaultSets: 3, defaultReps: '10-12', restSec: 45 },
  { id: 'ex-tricep-pushdown', name: 'Tricep Pushdown', muscleGroup: ['triceps'], category: 'isolation', equipment: ['cable', 'band'], defaultSets: 3, defaultReps: '12-15', restSec: 45 },
  { id: 'ex-overhead-tricep-ext', name: 'Overhead Tricep Extension', muscleGroup: ['triceps'], category: 'isolation', equipment: ['dumbbell', 'cable'], defaultSets: 3, defaultReps: '10-12', restSec: 45 },
  { id: 'ex-tricep-dips', name: 'Tricep Dips', muscleGroup: ['triceps'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '8-15', restSec: 60 },

  // ─── CORE / CARDIO ───────────────────────────────────────────────────
  { id: 'ex-plank', name: 'Plank', muscleGroup: ['core'], category: 'core_cardio', equipment: ['bodyweight'], defaultSets: 3, duration: '45s', restSec: 45 },
  { id: 'ex-bicycle-crunches', name: 'Bicycle Crunches', muscleGroup: ['core'], category: 'core_cardio', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '20', restSec: 30 },
  { id: 'ex-leg-raises', name: 'Leg Raises', muscleGroup: ['core'], category: 'core_cardio', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '15', restSec: 30 },
  { id: 'ex-treadmill-sprints', name: 'Treadmill Sprints', muscleGroup: ['full_body'], category: 'core_cardio', equipment: ['machine'], duration: '20 min', restSec: 120 },
  { id: 'ex-burpees', name: 'Burpees', muscleGroup: ['full_body', 'core'], category: 'core_cardio', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '10', restSec: 60 },
  { id: 'ex-jogging', name: 'Jogging', muscleGroup: ['legs'], category: 'core_cardio', equipment: ['bodyweight'], duration: '30 min', restSec: 0 },
  { id: 'ex-elliptical', name: 'Elliptical', muscleGroup: ['full_body'], category: 'core_cardio', equipment: ['machine'], duration: '30 min', restSec: 0 },
  { id: 'ex-dead-bugs', name: 'Dead Bugs', muscleGroup: ['core'], category: 'core_cardio', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '12 each', restSec: 30 },
  { id: 'ex-bird-dogs', name: 'Bird Dogs', muscleGroup: ['core', 'back'], category: 'core_cardio', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '10 each', restSec: 30 },
  { id: 'ex-v-ups', name: 'V-Ups', muscleGroup: ['core'], category: 'core_cardio', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '12', restSec: 30 },
  { id: 'ex-side-plank', name: 'Side Plank', muscleGroup: ['core'], category: 'core_cardio', equipment: ['bodyweight'], defaultSets: 3, duration: '30s each', restSec: 30 },
  { id: 'ex-hollow-hold', name: 'Hollow Body Hold', muscleGroup: ['core'], category: 'core_cardio', equipment: ['bodyweight'], defaultSets: 3, duration: '30s', restSec: 30 },
  { id: 'ex-mountain-climbers', name: 'Mountain Climbers', muscleGroup: ['core', 'full_body'], category: 'core_cardio', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '20', restSec: 30 },
  { id: 'ex-high-knees', name: 'High Knees', muscleGroup: ['full_body', 'legs'], category: 'core_cardio', equipment: ['bodyweight'], defaultSets: 3, duration: '30s', restSec: 30 },
  { id: 'ex-jumping-jacks', name: 'Jumping Jacks', muscleGroup: ['full_body'], category: 'core_cardio', equipment: ['bodyweight'], defaultSets: 3, duration: '45s', restSec: 30 },

  // ─── MOBILITY / RECOVERY ─────────────────────────────────────────────
  { id: 'ex-yoga-flow', name: 'Yoga Flow', muscleGroup: ['mobility', 'full_body'], category: 'core_cardio', equipment: ['bodyweight'], duration: '15 min' },
  { id: 'ex-foam-rolling', name: 'Foam Rolling', muscleGroup: ['mobility'], category: 'core_cardio', equipment: ['bodyweight'], duration: '10 min' },
  { id: 'ex-deep-stretching', name: 'Deep Stretching', muscleGroup: ['mobility', 'full_body'], category: 'core_cardio', equipment: ['bodyweight'], duration: '10 min' },
  { id: 'ex-light-walking', name: 'Light Walking', muscleGroup: ['mobility', 'legs'], category: 'core_cardio', equipment: ['bodyweight'], duration: '20 min' },

  // ─── EXPANDED BODYWEIGHT / BAND EXERCISES (Home Variety) ──────────────
  // Chest
  { id: 'ex-diamond-pushups', name: 'Diamond Push-ups', muscleGroup: ['chest', 'triceps'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '10-15', restSec: 60 },
  { id: 'ex-wide-pushups', name: 'Wide Push-ups', muscleGroup: ['chest'], category: 'accessory', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '12-15', restSec: 45 },
  { id: 'ex-decline-pushups', name: 'Decline Push-ups', muscleGroup: ['chest', 'shoulders'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '10-12', restSec: 60 },
  { id: 'ex-band-chest-fly', name: 'Band Chest Fly', muscleGroup: ['chest'], category: 'isolation', equipment: ['band'], defaultSets: 3, defaultReps: '15-20', restSec: 45 },

  // Back
  { id: 'ex-band-pull-apart', name: 'Band Pull-Aparts', muscleGroup: ['back', 'shoulders'], category: 'accessory', equipment: ['band'], defaultSets: 3, defaultReps: '15-20', restSec: 45 },
  { id: 'ex-prone-y-raise', name: 'Prone Y-Raises', muscleGroup: ['back', 'shoulders'], category: 'isolation', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '12-15', restSec: 45 },
  { id: 'ex-towel-rows', name: 'Towel Rows (Door)', muscleGroup: ['back'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '10-12', restSec: 90 },
  { id: 'ex-band-rows', name: 'Band Rows', muscleGroup: ['back'], category: 'accessory', equipment: ['band'], defaultSets: 3, defaultReps: '12-15', restSec: 60 },

  // Shoulders
  { id: 'ex-band-lateral-raise', name: 'Band Lateral Raise', muscleGroup: ['shoulders'], category: 'isolation', equipment: ['band'], defaultSets: 3, defaultReps: '15-20', restSec: 45 },
  { id: 'ex-band-overhead-press', name: 'Band Overhead Press', muscleGroup: ['shoulders'], category: 'compound', equipment: ['band'], defaultSets: 3, defaultReps: '12-15', restSec: 60 },
  { id: 'ex-wall-handstand-hold', name: 'Wall Handstand Hold', muscleGroup: ['shoulders'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, duration: '20s', restSec: 60 },

  // Legs
  { id: 'ex-bulgarian-split-squat', name: 'Bulgarian Split Squat', muscleGroup: ['legs'], category: 'compound', equipment: ['bodyweight', 'dumbbell'], defaultSets: 3, defaultReps: '10-12 each', restSec: 90 },
  { id: 'ex-glute-bridge', name: 'Glute Bridge', muscleGroup: ['legs'], category: 'accessory', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '15-20', restSec: 45 },
  { id: 'ex-wall-sit', name: 'Wall Sit', muscleGroup: ['legs'], category: 'accessory', equipment: ['bodyweight'], defaultSets: 3, duration: '45s', restSec: 60 },
  { id: 'ex-jump-squats', name: 'Jump Squats', muscleGroup: ['legs'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '12-15', restSec: 90 },
  { id: 'ex-single-leg-dl', name: 'Single Leg Deadlift', muscleGroup: ['legs', 'core'], category: 'accessory', equipment: ['bodyweight', 'dumbbell'], defaultSets: 3, defaultReps: '10 each', restSec: 60 },
  { id: 'ex-step-ups', name: 'Step-Ups', muscleGroup: ['legs'], category: 'accessory', equipment: ['bodyweight', 'dumbbell'], defaultSets: 3, defaultReps: '12 each', restSec: 60 },
  { id: 'ex-sumo-squat', name: 'Sumo Squat', muscleGroup: ['legs'], category: 'compound', equipment: ['bodyweight', 'dumbbell'], defaultSets: 3, defaultReps: '12-15', restSec: 90 },

  // Arms
  { id: 'ex-band-curls', name: 'Band Bicep Curls', muscleGroup: ['biceps'], category: 'isolation', equipment: ['band'], defaultSets: 3, defaultReps: '15-20', restSec: 45 },
  { id: 'ex-chair-dips', name: 'Chair Dips', muscleGroup: ['triceps', 'chest'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '10-15', restSec: 60 },
  { id: 'ex-band-tricep-ext', name: 'Band Tricep Extension', muscleGroup: ['triceps'], category: 'isolation', equipment: ['band'], defaultSets: 3, defaultReps: '15-20', restSec: 45 },
  { id: 'ex-close-grip-pushups', name: 'Close-Grip Push-ups', muscleGroup: ['triceps', 'chest'], category: 'compound', equipment: ['bodyweight'], defaultSets: 3, defaultReps: '10-12', restSec: 60 },
];

export const getExercises = (
  muscleGroups: MuscleGroup[], 
  category: MovementCategory, 
  location: string, 
  count: number = 1,
  excludeIds?: Set<string>,
  excludeMuscles?: MuscleGroup[]
): PoolExercise[] => {
  const isHome = location.toLowerCase() === 'home';
  // RC-1 FIX: Home = bodyweight + band ONLY. No dumbbells, barbells, machines, cables.
  const allowedHomeEquipment: EquipmentType[] = ['bodyweight', 'band'];
  
  const validExercises = EXERCISE_POOL.filter(ex => {
    // 1. Deduplication check
    if (excludeIds && excludeIds.has(ex.id)) return false;

    // 2. FORBIDDEN muscle check — reject if ANY muscle is forbidden
    if (excludeMuscles && ex.muscleGroup.some(mg => excludeMuscles.includes(mg))) return false;

    // 3. Check muscle group match — at least one muscle must be in allowed list
    const matchesMuscleGroup = ex.muscleGroup.some(mg => muscleGroups.includes(mg));
    if (!matchesMuscleGroup) return false;
    
    // 4. Check category match
    if (ex.category !== category) return false;
    
    // 5. Equipment constraint — HARD FILTER
    if (isHome) {
      // EVERY equipment option must be home-compatible. Reject exercises that
      // can only be done with gym equipment, even if they have a bodyweight variant.
      // We keep exercises where at least one equipment is allowed AND strip non-allowed.
      const homeCompatible = ex.equipment.filter(eq => allowedHomeEquipment.includes(eq));
      if (homeCompatible.length === 0) return false;
    }
    
    return true;
  }).map(ex => {
    // Strip non-home equipment from output to prevent UI confusion
    if (isHome) {
      return {
        ...ex,
        equipment: ex.equipment.filter(eq => allowedHomeEquipment.includes(eq))
      };
    }
    return ex;
  });

  // Shuffle and return requested count
  return [...validExercises].sort(() => 0.5 - Math.random()).slice(0, count);
};
