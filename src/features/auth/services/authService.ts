import { supabase } from '../../../core/supabase/client';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { trackAnalyticsEvent, identifyUser, resetAnalytics } from '../../../core/analytics/posthog';
import { queryClient } from '../../../core/query/client';
import { useWorkoutSessionStore } from '../../workout/stores/workoutSessionStore';

// Ensure browser closes after redirect
WebBrowser.maybeCompleteAuthSession();

export const authService = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    
    if (data.user) {
      identifyUser(data.user.id, { email });
      trackAnalyticsEvent('user_signed_up', { method: 'email', user_id: data.user.id });
    }

    // If auto-logged in by Supabase, sign them out manually
    if (data.session) {
      await supabase.auth.signOut();
    }
    
    return data;
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    return data;
  },

  signInWithGoogle: async () => {
    try {
      // Generate a deep link to return to the app
      // Using /--/auth is a common Expo pattern to ensure Android captures the redirect correctly
      const returnUrl = Linking.createURL('--/auth');
      console.log('[AuthService] Return URL:', returnUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: returnUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No redirect URL from Supabase');

      // Open the browser for OAuth
      const result = await WebBrowser.openAuthSessionAsync(data.url, returnUrl);

      if (result.type === 'success' && 'url' in result) {
        const parsedUrl = new URL(result.url.replace('#', '?'));
        const accessToken = parsedUrl.searchParams.get('access_token');
        const refreshToken = parsedUrl.searchParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          return { success: true };
        }
      }
      
      // Fallback: If WebBrowser closes but Supabase session is already set by listener
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return { success: true };

      throw new Error('Google sign-in was cancelled or failed to retrieve session');
    } catch (error) {
      console.error('[AuthService] Google Sign-In Error:', error);
      throw error;
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Clear client-side caches and analytics
    try {
      queryClient.clear();
    } catch (e) {
      console.warn('Failed to clear query client on signOut', e);
    }

    try {
      resetAnalytics();
    } catch (e) {
      console.warn('Failed to reset analytics on signOut', e);
    }

    try {
      useWorkoutSessionStore.getState().clearSession();
    } catch (e) {
      console.warn('Failed to clear workout session store on signOut', e);
    }
  },
};
