import { ExerciseDetail } from '../hooks/useDayDetail';
import { normalizeExerciseName } from '../utils/exerciseNormalizer';
import { EXERCISE_POOL } from '../data/exercisePools';
import exercisesJson from '../data/exercises.json';

// Simple in-memory cache to prevent re-fetching the same exercise in a session
const exerciseDetailCache = new Map<string, ExerciseDetail>();

/**
 * Repository method to fetch Exercise Details.
 * New Offline-First Architecture: In-Memory Cache -> local exercises.json
 */
export async function getExerciseDetailById(id: string): Promise<{ data: ExerciseDetail | null; source: 'cache' | 'static' | 'db' }> {
  if (!id) return { data: null, source: 'static' };

  console.log("Selected Exercise ID (Modal Trigger):", id);

  // 1. Check in-memory cache
  if (exerciseDetailCache.has(id)) {
    return { data: exerciseDetailCache.get(id)!, source: 'cache' };
  }

  // Find in pool to get name / primary muscle
  const poolEx = EXERCISE_POOL.find(e => e.id === id || e.name === id);
  if (!poolEx) {
    console.warn(`[exerciseDetailsRepository] Exercise ID ${id} not found in pool. Proceeding to fallback search.`);
  }

  const exName = poolEx?.name || id;
  const primaryMuscle = poolEx?.muscleGroup[0] || 'Full Body';

  // 2. Search local JSON
  const jsonMatch = (exercisesJson as any[]).find(
    e => e.exercise_id === exName || e.exercise_id === id
  );

  if (jsonMatch) {
    const detail: ExerciseDetail = {
      id: id,
      name: exName,
      primaryMuscle: primaryMuscle,
      steps: jsonMatch.steps || ['Focus on controlled movement.'],
      formCues: jsonMatch.cues || [],
      beginnerLoadTip: 'Start light to master the form.',
      commonMistakes: jsonMatch.mistakes || [],
    };
    exerciseDetailCache.set(id, detail);
    return { data: detail, source: 'static' };
  }

  // 3. Fallback generic
  const defaultDetail: ExerciseDetail = {
    id: id,
    name: exName,
    primaryMuscle: primaryMuscle,
    steps: ['Focus on controlled movement and full range of motion.'],
    formCues: ['Keep your core engaged.'],
    beginnerLoadTip: 'Focus on form over weight.',
    commonMistakes: ['Rushing the movement.', 'Using momentum.'],
  };

  exerciseDetailCache.set(id, defaultDetail);
  return { data: defaultDetail, source: 'static' };
}
