import { supabase } from '../../../core/supabase/client';
import { ExerciseDetail } from '../hooks/useDayDetail';
import { normalizeExerciseName } from '../utils/exerciseNormalizer';
import { getStaticExerciseDetailById } from '../data/staticExerciseDetails';
import { EXERCISE_POOL } from '../data/exercisePools';
import rawExercisesJson from '../data/exercises.json';

// Simple in-memory cache to prevent re-fetching the same exercise in a session
const exerciseDetailCache = new Map<string, ExerciseDetail>();

/**
 * Repository method to fetch Exercise Details.
 * Order of resolution: In-Memory Cache -> Local Static Fallback -> Supabase SQL -> Cache
 * Never throws, always returns null if utterly missing.
 */
export async function getExerciseDetailById(id: string): Promise<{ data: ExerciseDetail | null; source: 'cache' | 'static' | 'db' }> {
  if (!id) return { data: null, source: 'static' };

  console.log("Selected Exercise ID:", id); // Temporary debugging log

  // 1. Check in-memory cache
  if (exerciseDetailCache.has(id)) {
    return { data: exerciseDetailCache.get(id)!, source: 'cache' };
  }

  // Find in pool
  const poolEx = EXERCISE_POOL.find(e => e.id === id);
  if (!poolEx) {
    console.warn(`[exerciseDetailsRepository] Exercise ID ${id} not found in pool`);
    return { data: null, source: 'static' };
  }

  // 2. Try static fallback (this satisfies the Instant/Offline/No-Loader requirement for core list)
  const staticData = getStaticExerciseDetailById(id);
  if (staticData) {
    exerciseDetailCache.set(id, staticData);
    return { data: staticData, source: 'static' };
  }

  // 3. Try JSON fallback before hitting the DB (since DB is currently empty for most exercises)
  const rawJson = rawExercisesJson as Record<string, any>;
  let jsonKey = Object.keys(rawJson).find(k => 
    poolEx.name.toLowerCase() === k.toLowerCase() || 
    poolEx.name.toLowerCase() === k.toLowerCase() + 's' ||
    poolEx.name.toLowerCase() + 's' === k.toLowerCase() ||
    poolEx.name.toLowerCase().replace(/s$/, '') === k.toLowerCase().replace(/s$/, '')
  );
  
  if (jsonKey) {
    const jsonData = rawJson[jsonKey];
    const detail: ExerciseDetail = {
      id: id,
      name: poolEx.name,
      primaryMuscle: poolEx.muscleGroup[0] || 'Full Body',
      steps: jsonData?.steps || ['Follow general form instructions for this exercise.'],
      formCues: jsonData?.tips ? [jsonData.tips] : [],
      beginnerLoadTip: '',
      commonMistakes: [],
    };
    exerciseDetailCache.set(id, detail);
    return { data: detail, source: 'static' };
  }

  // 4. Fallback to SQL DB if a user is online and we missed both static and JSON dictionaries
  try {
    const { data, error } = await supabase
      .from('exercise_details')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      // If none of the above hit (rare), return a generated default so UI doesn't crash
      const detail: ExerciseDetail = {
        id: id,
        name: poolEx.name,
        primaryMuscle: poolEx.muscleGroup[0] || 'Full Body',
        steps: ['Focus on controlled movement.'],
        formCues: [],
        beginnerLoadTip: '',
        commonMistakes: [],
      };
      exerciseDetailCache.set(id, detail);
      return { data: detail, source: 'static' };
    }

    const detail: ExerciseDetail = {
      id: data.id,
      name: data.name,
      primaryMuscle: data.primary_muscle,
      steps: data.steps,
      formCues: data.form_cues,
      beginnerLoadTip: data.beginner_load_tip,
      commonMistakes: data.common_mistakes,
    };

    exerciseDetailCache.set(id, detail);
    return { data: detail, source: 'db' };
  } catch (err) {
    console.warn(`[exerciseDetailsRepository] Exception on DB fetch for ${id}`, err);
    return { data: null, source: 'db' };
  }
}

/**
 * Runs once internally to ensure the SQL backend has the MVP data.
 * Follows the "only insert if empty" rule.
 */
export async function seedExerciseDetails(): Promise<void> {
  try {
    const { count, error: countErr } = await supabase
      .from('exercise_details')
      .select('*', { count: 'exact', head: true });

    if (countErr) {
      console.warn('[exerciseDetailsRepository] Seed check failed', countErr);
      return;
    }

    if (count === 0) {
      console.log('[exerciseDetailsRepository] DB empty. Seeding MVP data from static fallback...');
      
      const { STATIC_EXERCISE_MAP } = await import('../data/staticExerciseDetails');
      const staticRows = Array.from(STATIC_EXERCISE_MAP.values());
      const insertPayload = staticRows.map(ex => ({
        id: ex.id,
        name: normalizeExerciseName(ex.name),
        primary_muscle: ex.primaryMuscle,
        steps: ex.steps,
        form_cues: ex.formCues,
        beginner_load_tip: ex.beginnerLoadTip,
        common_mistakes: ex.commonMistakes
      }));

      const { error: insertErr } = await supabase
        .from('exercise_details')
        .insert(insertPayload);

      if (insertErr) {
        console.warn('[exerciseDetailsRepository] Seed insertion failed', insertErr);
      } else {
        console.log('[exerciseDetailsRepository] Successfully seeded DB with MVP data.');
      }
    } else {
      console.log('[exerciseDetailsRepository] Database already has rows, skipping seed.');
    }
  } catch (err) {
    console.warn('[exerciseDetailsRepository] Unhandled exception during seeding', err);
  }
}
