import { useState, useEffect } from 'react';
import { getExerciseDetailByName } from '../services/exerciseDetailsRepository';
import { ExerciseDetail } from './useDayDetail';

type ExerciseDetailState = {
  data: ExerciseDetail | null;
  source: 'static' | 'db' | 'cache' | 'ai' | null;
};

/**
 * Custom hook to safely fetch Exercise Details without global loaders.
 * Returns instantly utilizing local static data if DB resolution is slow or failing.
 */
export const useExerciseDetail = (exerciseName: string | null) => {
  const [detail, setDetail] = useState<ExerciseDetailState>({ data: null, source: null });

  useEffect(() => {
    let mounted = true;

    async function fetchDetail() {
      if (!exerciseName) {
        setDetail({ data: null, source: null });
        return;
      }

      // getExerciseDetailByName handles the synchronous static fallback under the hood, 
      // ensuring `data` is returned immediately if local or cached, and gracefully ignores
      // network errors if falling back to static offline maps.
      const result = await getExerciseDetailByName(exerciseName);
      
      if (mounted) {
        setDetail(result);
      }
    }

    fetchDetail();

    return () => {
      mounted = false;
    };
  }, [exerciseName]);

  return detail;
};
