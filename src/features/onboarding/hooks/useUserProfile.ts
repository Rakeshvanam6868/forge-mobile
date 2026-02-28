import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../core/supabase/client';
import { useAuth } from '../../auth/hooks/useAuth';

export type UserProfile = {
  id: string;
  goal: string;
  level: string;
  environment: string;
  diet_type: string;
  program_start_date: string;
  created_at?: string;
};

export const useUserProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user id');
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
        
      if (error) {
        throw error;
      }
      
      // maybeSingle returns null if no rows found
      return data as UserProfile | null;
    },
    enabled: !!user?.id,
  });

  // Create user profile
  const createProfile = useMutation({
    mutationFn: async (newProfile: Omit<UserProfile, 'id' | 'created_at'>) => {
      if (!user?.id) throw new Error('No user id');

      const profileData = {
        id: user.id,
        ...newProfile,
      };

      const { data, error } = await supabase
        .from('users')
        .insert(profileData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(['userProfile', user?.id], data);
      
      // Invalidate the todayPlan query so the Home screen immediately fetches the new plan
      queryClient.invalidateQueries({ queryKey: ['todayPlan'] });
    },
  });

  return {
    profile,
    isLoading,
    createProfile,
  };
};
