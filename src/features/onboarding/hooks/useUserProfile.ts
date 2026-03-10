import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../core/supabase/client';
import { useAuth } from '../../auth/hooks/useAuth';

export interface UserProfile {
  id: string;
  goal: string;
  level: string;
  environment: string;
  diet_type: string;
  weekly_frequency: string;
  last_workout_type: string;
  onboarding_completed: boolean;
  program_start_date?: string;
  created_at?: string;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
        throw error;
      }
      return data as UserProfile | null;
    },
    enabled: !!user,
  });

  // Upsert profile
  const upsertProfile = useMutation({
    mutationFn: async (profileData: Partial<UserProfile>) => {
      if (!user) throw new Error('No user logged in');
      
      // Use .maybeSingle() instead of .single() to prevent coercion errors
      // when PostgREST cannot coerce the result to a single JSON object
      const { data, error } = await supabase
        .from('users')
        .upsert({ 
          id: user.id, 
          ...profileData 
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(['userProfile', user?.id], data);
      }
    },
  });

  return {
    profile,
    isLoading,
    upsertProfile,
  };
};
