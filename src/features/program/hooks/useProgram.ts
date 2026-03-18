import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../core/supabase/client';
import { useAuth } from '../../auth/hooks/useAuth';
import { useUserProfile } from '../../onboarding/hooks/useUserProfile';
import { generateProgram } from '../services/programGenerator';
import { useEffect, useState } from 'react';

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
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();
  const [isRegenerating, setIsRegenerating] = useState(false);

  const query = useQuery({
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
  });

  // 9️⃣ NO PROGRAM EDGE CASE (Auto-Regenerate)
  useEffect(() => {
    if (query.isSuccess && !query.data && profile?.onboarding_completed && !isRegenerating) {
      setIsRegenerating(true);
      generateProgram(
        user!.id,
        profile.goal,
        profile.level,
        profile.environment,
        profile.diet_type || 'Any'
      )
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['program', user?.id] });
          setIsRegenerating(false);
        })
        .catch((err) => {
          console.error('Auto-regeneration failed:', err);
          setIsRegenerating(false);
        });
    }
  }, [query.isSuccess, query.data, profile, isRegenerating, user, queryClient]);

  return {
    ...query,
    isLoading: query.isLoading || isRegenerating || (query.isSuccess && !query.data && profile?.onboarding_completed),
  };
};
