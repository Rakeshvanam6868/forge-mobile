import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/supabase/client';

export type ProgramDay = {
  id: string;
  program_week_id: string;
  day_number: number;
  title: string;
  focus_type: string;
};

export type GroceryItem = {
  id: string;
  program_week_id: string;
  category: string;
  item_name: string;
};

export type WeekData = {
  weekId: string;
  weekNumber: number;
  days: ProgramDay[];
  groceries: GroceryItem[];
};

/**
 * Fetches a specific week's days and grocery list.
 */
export const useCurrentWeek = (programId: string | undefined, weekNumber: number) => {
  return useQuery({
    queryKey: ['programWeek', programId, weekNumber],
    queryFn: async (): Promise<WeekData | null> => {
      if (!programId) return null;

      // Use .maybeSingle() to prevent "Cannot coerce" error
      const { data: week, error: weekError } = await supabase
        .from('program_weeks')
        .select('*')
        .eq('program_id', programId)
        .eq('week_number', weekNumber)
        .maybeSingle();

      if (weekError) {
        if (weekError.code === 'PGRST116') return null;
        throw weekError;
      }
      if (!week) return null;

      // Fetch days for this week
      const { data: days, error: daysError } = await supabase
        .from('program_days')
        .select('*')
        .eq('program_week_id', week.id)
        .order('day_number', { ascending: true });

      if (daysError) throw daysError;

      // Fetch groceries for this week
      const { data: groceries, error: grocError } = await supabase
        .from('week_groceries')
        .select('*')
        .eq('program_week_id', week.id)
        .order('category', { ascending: true });

      if (grocError) throw grocError;

      return {
        weekId: week.id,
        weekNumber,
        days: (days ?? []) as ProgramDay[],
        groceries: (groceries ?? []) as GroceryItem[],
      };
    },
    enabled: !!programId,
  });
};
