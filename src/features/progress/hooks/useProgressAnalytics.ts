import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/supabase/client';
import { useAuth } from '../../auth/hooks/useAuth';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export type ConsistencyMetrics = {
  total: number;
  thisWeek: number;
  thisMonth: number;
  currentStreak: number;
  longestStreak: number;
};

export type MuscleVolume = {
  muscle_group: string;
  total_volume: number;
};

export type WeeklyVolume = {
  week: number;
  year: number;
  total_volume: number;
};

export type ExerciseProgress = {
  week: number;
  year: number;
  best_weight: number;
  best_reps: number;
  max_1rm: number;
  max_volume: number;
};

export type PersonalRecord = {
  exercise_id: string;
  exercise_name: string;
  max_weight: number;
  max_reps: number;
  max_volume: number;
};

// ═══════════════════════════════════════════════
// Hooks
// ═══════════════════════════════════════════════

export const useConsistencyMetrics = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['progress_consistency', user?.id],
    queryFn: async (): Promise<ConsistencyMetrics | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase.rpc('get_workout_consistency', { p_user_id: user.id });
      if (error) throw error;
      return data as ConsistencyMetrics;
    },
    enabled: !!user?.id,
  });
};

export const useMuscleVolumeBalance = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['progress_muscle_balance', user?.id],
    queryFn: async (): Promise<MuscleVolume[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase.rpc('get_muscle_volume_balance', { p_user_id: user.id });
      if (error) throw error;
      return (data || []) as MuscleVolume[];
    },
    enabled: !!user?.id,
  });
};

export const useWeeklyVolume = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['progress_weekly_volume', user?.id],
    queryFn: async (): Promise<WeeklyVolume[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase.rpc('get_weekly_volume', { p_user_id: user.id });
      if (error) throw error;
      return (data || []) as WeeklyVolume[];
    },
    enabled: !!user?.id,
  });
};

export const usePersonalRecords = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['progress_prs', user?.id],
    queryFn: async (): Promise<PersonalRecord[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase.rpc('get_personal_records', { p_user_id: user.id });
      if (error) throw error;
      // The RPC returns exercise details and PRs. Filter out null bounds if they occur
      return (data || []).filter((r: any) => r.max_weight > 0 || r.max_reps > 0) as PersonalRecord[];
    },
    enabled: !!user?.id,
  });
};

export const useExerciseProgress = (exerciseId: string | null) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['progress_exercise', user?.id, exerciseId],
    queryFn: async (): Promise<ExerciseProgress[]> => {
      if (!user?.id || !exerciseId) return [];
      const { data, error } = await supabase.rpc('get_exercise_progress', { 
        p_user_id: user.id, 
        p_exercise_id: exerciseId 
      });
      if (error) throw error;
      return (data || []) as ExerciseProgress[];
    },
    enabled: !!user?.id && !!exerciseId,
  });
};
