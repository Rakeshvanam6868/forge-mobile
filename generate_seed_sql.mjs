import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// EXERCISE POOL
const EXERCISE_POOL = [
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

function escapeSql(str) {
    if (str == null) return "NULL";
    return `'${String(str).replace(/'/g, "''")}'`;
}

function escapeSqlArray(arr) {
    if (!arr || arr.length === 0) return "'{}'";
    const items = arr.map(a => `"${String(a).replace(/"/g, '""')}"`).join(',');
    return `'{${items}}'`;
}

function generateSql() {
    let sql = "-- Migration: Seed Exercise Data\n\n";

    // 1. exercises
    sql += "-- 1. Seeds for exercises table\n";
    sql += "INSERT INTO public.exercises (legacy_id, name, muscle_groups, category, equipment, default_sets, default_reps, duration)\nVALUES\n";

    const poolValues = EXERCISE_POOL.map(ex => {
        return `  (${escapeSql(ex.id)}, ${escapeSql(ex.name)}, ${escapeSqlArray(ex.muscleGroup)}, ${escapeSql(ex.category)}, ${escapeSqlArray(ex.equipment)}, ${ex.defaultSets || "NULL"}, ${escapeSql(ex.defaultReps)}, ${escapeSql(ex.duration)})`;
    });

    sql += poolValues.join(",\n") + "\nON CONFLICT (legacy_id) DO NOTHING;\n\n";

    // 2. exercise_details
    const jsonPath = path.join(__dirname, 'src', 'features', 'program', 'data', 'exercises.json');
    const detailsStr = fs.readFileSync(jsonPath, 'utf-8');
    const detailsJson = JSON.parse(detailsStr);

    const detailPayload = [];
    for (const [key, value] of Object.entries(detailsJson)) {
        const legacy_id = `ex-${key.toLowerCase().replace(/[\s\(\)]+/g, '-')}`;

        // We only create payload strings
        detailPayload.push({
            id: legacy_id,
            name: key,
            primaryMuscle: value.muscles?.[0] || 'Full Body',
            steps: value.steps || [],
            formCues: value.tips ? [value.tips] : []
        });
    }

    const rawStaticExercises = [
        { id: 'ex-db-bench-press', name: 'Dumbbell Bench Press', primaryMuscle: 'Chest', steps: ['Lie back on the bench holding dumbbells directly above your chest', 'Lower the dumbbells slowly until they are in line with your chest', 'Press the dumbbells back up to the starting position'], formCues: ['Keep your feet flat on the ground', 'Squeeze shoulders down and back'] },
        { id: 'ex-overhead-press', name: 'Overhead Press', primaryMuscle: 'Shoulders', steps: ['Stand with feet shoulder-width apart, holding dumbbells at shoulder height', 'Press the weights straight up overhead until arms are extended', 'Lower under control back to shoulders'], formCues: ['Brace your core', 'Do not arch your lower back aggressively'] },
        { id: 'ex-bb-squat', name: 'Barbell Squat', primaryMuscle: 'Quads / Glutes', steps: ['Unrack the barbell across your upper back, stepping back', 'Squat down by pushing hips back and bending knees', 'Drive through your heels to return to standing'], formCues: ['Chest up', 'Knees track over toes', 'Brace core'] }
    ];

    rawStaticExercises.forEach(ex => {
        const existingIdx = detailPayload.findIndex(d => d.id === ex.id);
        if (existingIdx >= 0) {
            detailPayload[existingIdx] = ex;
        } else {
            detailPayload.push(ex);
        }
    });

    sql += "-- 2. Seeds for exercise_details table\n";
    sql += "INSERT INTO public.exercise_details (id, name, primary_muscle, steps, form_cues)\nVALUES\n";

    const detailValues = detailPayload.map(d => {
        // Only escape the arrays properly for Postgres
        const stepsArray = escapeSqlArray(d.steps);
        const cuesArray = escapeSqlArray(d.formCues);
        return `  (${escapeSql(d.id)}, ${escapeSql(d.name)}, ${escapeSql(d.primaryMuscle)}, ${stepsArray}, ${cuesArray})`;
    });

    sql += detailValues.join(",\n") + "\nON CONFLICT (id) DO NOTHING;\n";

    fs.writeFileSync('supabase/migrations/010_seed_exercises.sql', sql);
    console.log("SQL File Generated: supabase/migrations/010_seed_exercises.sql");
}

generateSql();
