import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { useUserProfile } from '../../onboarding/hooks/useUserProfile';
import { supabase } from '../../../core/supabase/client';
import { toDateString } from '../../../core/utils/dateUtils';
import { UserEvent } from '../../analytics/types/analytics';
import { useCurrentProgram } from '../../program/hooks/useProgram';
import { ProgramDay } from '../../program/hooks/useWeekPlan';
import { resolveProgramState, ProgramStateResolution } from '../../program/services/programStateEngine';

export const useProgramState = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();
  const { data: program } = useCurrentProgram();

  // 1. Fetch ALL user_events (Single source of truth for Analytics & Program State)
  const { data: events, isLoading: isEventsLoading } = useQuery({
    queryKey: ['userEvents', user?.id],
    queryFn: async (): Promise<UserEvent[]> => {
      const { data, error } = await supabase
        .from('user_events')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as UserEvent[];
    },
    enabled: !!user?.id,
  });

  // 2. Fetch the full active Program Structure (Flat list of days)
  const { data: programStructure, isLoading: isStructureLoading } = useQuery({
    queryKey: ['programStructure', program?.id],
    queryFn: async (): Promise<ProgramDay[]> => {
      if (!program?.id) return [];
      
      // Fetch weeks
      const { data: weeks, error: weeksErr } = await supabase
        .from('program_weeks')
        .select('id, week_number')
        .eq('program_id', program.id)
        .order('week_number', { ascending: true });
        
      if (weeksErr) throw weeksErr;
      if (!weeks || weeks.length === 0) return [];
      
      const weekIds = weeks.map(w => w.id);
      
      // Fetch days for those weeks
      const { data: days, error: daysErr } = await supabase
        .from('program_days')
        .select('*')
        .in('program_week_id', weekIds)
        .order('day_number', { ascending: true });
        
      if (daysErr) throw daysErr;
      
      // We need to sort days logically across weeks
      // A quick way is to join them in memory, or assume day_number is globally unique per week.
      // Usually day_number is 1-7 per week. So sort by week_number then day_number.
      const weeksMap = new Map(weeks.map(w => [w.id, w.week_number]));
      const sortedDays = (days || []).sort((a, b) => {
        const wA = weeksMap.get(a.program_week_id) || 0;
        const wB = weeksMap.get(b.program_week_id) || 0;
        if (wA !== wB) return wA - wB;
        return a.day_number - b.day_number;
      });
      
      return sortedDays as ProgramDay[];
    },
    enabled: !!program?.id,
  });

  // 3. Resolve Program State purely from events and structure
  const state = useMemo<ProgramStateResolution | null>(() => {
    if (!events || !programStructure) return null;
    const today = toDateString(new Date());
    return resolveProgramState(events, programStructure, profile, today);
  }, [events, programStructure, profile]);

  // 4. Completion Mutation (Atomic & Event-driven)
  const completeToday = useMutation({
    mutationFn: async ({
      energyLevel,
      difficulty = 'perfect',
      programDayNumber
    }: {
      energyLevel: number;
      difficulty?: string;
      programDayNumber: number;
    }) => {
      if (!user?.id) throw new Error('No user');
      
      const payload: Partial<UserEvent> = {
        user_id: user.id,
        event_type: 'DAY_COMPLETED',
        event_date: toDateString(new Date()),
        event_meta: {
          programDayNumber,
          energyLevel,
          difficulty
        }
      };

      const { error } = await supabase.from('user_events').insert(payload);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      // ⚡ REACT QUERY ORCHESTRATION GUARANTEE ⚡
      // Invalidate events so that useProgramState and useAnalytics recompute
      queryClient.invalidateQueries({ queryKey: ['userEvents', user?.id] });
      // Minor caches that might depend on it
      queryClient.invalidateQueries({ queryKey: ['exerciseHistory', user?.id] });
    },
  });

  const isLoading = isEventsLoading || isStructureLoading || !state;

  return {
    state,
    isLoading,
    completeToday,
  };
};
