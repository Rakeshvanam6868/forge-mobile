import { supabase } from '../../../core/supabase/client';
import { ExerciseDetail } from '../hooks/useDayDetail';
import { normalizeExerciseName } from '../utils/exerciseNormalizer';
import { getStaticExerciseDetail } from '../data/staticExerciseDetails';

// Simple in-memory cache to prevent re-fetching the same exercise in a session
const exerciseDetailCache = new Map<string, ExerciseDetail>();

/**
 * Repository method to fetch Exercise Details.
 * Order of resolution: In-Memory Cache -> Local Static Fallback -> Supabase SQL -> Cache
 * Never throws, always returns null if utterly missing.
 */
export async function getExerciseDetailByName(name: string): Promise<{ data: ExerciseDetail | null; source: 'cache' | 'static' | 'db' }> {
  if (!name) return { data: null, source: 'static' };

  const normalizedName = normalizeExerciseName(name);

  // 1. Check in-memory cache
  if (exerciseDetailCache.has(normalizedName)) {
    return { data: exerciseDetailCache.get(normalizedName)!, source: 'cache' };
  }

  // 2. Try static fallback (this satisfies the Instant/Offline/No-Loader requirement)
  const staticData = getStaticExerciseDetail(normalizedName);
  if (staticData) {
    // Cache it for future local access just in case
    exerciseDetailCache.set(normalizedName, staticData);
    return { data: staticData, source: 'static' };
  }

  // 3. Fallback to SQL DB if a user is online and we missed the static dictionary
  try {
    const { data, error } = await supabase
      .from('exercise_details')
      .select('*')
      .eq('name', normalizedName)
      .single();

    if (error || !data) {
      console.warn(`[exerciseDetailsRepository] Missed DB fetch for ${normalizedName}`);
      return { data: null, source: 'db' };
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

    exerciseDetailCache.set(normalizedName, detail);
    return { data: detail, source: 'db' };
  } catch (err) {
    console.warn(`[exerciseDetailsRepository] Exception on DB fetch for ${normalizedName}`, err);
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
