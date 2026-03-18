import { useState, useEffect } from 'react';
import { getExerciseDetailById } from '../services/exerciseDetailsRepository';
import { ExerciseDetail } from './useDayDetail';

type ExerciseDetailState = {
  data: ExerciseDetail | null;
  source: 'static' | 'db' | 'cache' | 'ai' | null;
};

/**
 * Custom hook to safely fetch Exercise Details without global loaders.
 * Returns instantly utilizing local static data if DB resolution is slow or failing.
 */
export const useExerciseDetail = (exerciseId: string | null) => {
  const [detail, setDetail] = useState<ExerciseDetailState>({ data: null, source: null });

  useEffect(() => {
    let mounted = true;

    async function fetchDetail() {
      if (!exerciseId) {
        setDetail({ data: null, source: null });
        return;
      }

      const result = await getExerciseDetailById(exerciseId);
      
      if (mounted) {
        setDetail(result);
      }
    }

    fetchDetail();

    return () => {
      mounted = false;
    };
  }, [exerciseId]);

  return detail;
};
