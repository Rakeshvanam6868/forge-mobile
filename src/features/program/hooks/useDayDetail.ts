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
  
  // New AI Compatible Optional Fields
  restSec?: number;
  load?: string;
  tempo?: string;
  cue?: string;
  progression?: string;
};

export type Exercise = {
  name: string;
  sets?: number;
  reps?: string;
  restSec?: number;
  load?: string;
  tempo?: string;
  cue?: string;
  progression?: string;
};

export type ExerciseDetail = {
  id: string;
  name: string;
  primaryMuscle: string;
  steps: string[];
  formCues: string[];
  beginnerLoadTip: string;
  commonMistakes: string[];
};

export type SessionBlock = {
  title: string;
  type: 'warmup' | 'primary' | 'accessory' | 'finisher' | 'core';
  exercises: Exercise[];
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
  blocks?: SessionBlock[]; // AI Content
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

      // Map workouts with spread to preserve AI compatible fields
      const mappedWorkouts = (workouts ?? []).map((w: any) => {
        const mapped = {
          ...w,
          // DB returns snake_case for rest_sec, so map it explicitly if there
          restSec: w.rest_sec !== undefined ? w.rest_sec : w.restSec,
        };
        return mapped;
      }) as Workout[];

      return {
        ...day,
        dayId: day.id,
        title: day.title,
        focusType: day.focus_type,
        dayNumber: day.day_number,
        workouts: mappedWorkouts,
        meals: (meals ?? []) as Meal[],
        blocks: day.blocks,
      };
    },
    enabled: !!dayId,
  });
};
