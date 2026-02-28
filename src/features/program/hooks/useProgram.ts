import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/supabase/client';
import { useAuth } from '../../auth/hooks/useAuth';

export type Program = {
  id: string;
  user_id: string;
  goal: string;
  level: string;
  location: string;
  diet_type: string;
  duration_weeks: number;
  created_at: string;
};

/**
 * Fetches the user's program. One program per user.
 * Cached — never refetched unless invalidated.
 */
export const useCurrentProgram = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['program', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Program | null;
    },
    enabled: !!user?.id,
    staleTime: Infinity, // program doesn't change
  });
};
