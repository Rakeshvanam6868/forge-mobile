import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/supabase/client';

export type Workout = {
  id: string;
  program_day_id: string;
  exercise_name: string;
  sets: number | null;
  reps: string | null;
  duration: string | null;
  video_url: string | null;
  order_index: number;
};

export type Meal = {
  id: string;
  program_day_id: string;
  meal_type: string;
  title: string;
  description: string | null;
};

export type DayDetail = {
  dayId: string;
  title: string;
  focusType: string;
  dayNumber: number;
  workouts: Workout[];
  meals: Meal[];
};

/**
 * Fetches full detail for a specific program day: workouts + meals.
 */
export const useDayDetail = (dayId: string | undefined) => {
  return useQuery({
    queryKey: ['dayDetail', dayId],
    queryFn: async (): Promise<DayDetail | null> => {
      if (!dayId) return null;

      // Fetch the day row
      const { data: day, error: dayError } = await supabase
        .from('program_days')
        .select('*')
        .eq('id', dayId)
        .single();

      if (dayError) throw dayError;

      // Fetch workouts
      const { data: workouts, error: wErr } = await supabase
        .from('day_workouts')
        .select('*')
        .eq('program_day_id', dayId)
        .order('order_index', { ascending: true });

      if (wErr) throw wErr;

      // Fetch meals
      const { data: meals, error: mErr } = await supabase
        .from('day_meals')
        .select('*')
        .eq('program_day_id', dayId)
        .order('meal_type', { ascending: true });

      if (mErr) throw mErr;

      return {
        dayId: day.id,
        title: day.title,
        focusType: day.focus_type,
        dayNumber: day.day_number,
        workouts: (workouts ?? []) as Workout[],
        meals: (meals ?? []) as Meal[],
      };
    },
    enabled: !!dayId,
  });
};
