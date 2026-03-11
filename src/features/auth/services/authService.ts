import { supabase } from '../../../core/supabase/client';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { trackAnalyticsEvent, identifyUser } from '../../../core/analytics/posthog';

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
      trackAnalyticsEvent('user_signed_up', { method: 'email' });
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
    // Generate a deep link to return to the app
    const returnUrl = Linking.createURL('');

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

    if (result.type === 'success') {
      const { url } = result;
      // We need to parse the URL and extract the session tokens to pass to Supabase
      // Usually Supabase's `onAuthStateChange` listener handles this automatically
      // if it's initialized with the URL, but React Native deep links require manual processing sometimes
      const parsedUrl = new URL(url.replace('#', '?'));
      const accessToken = parsedUrl.searchParams.get('access_token');
      const refreshToken = parsedUrl.searchParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
      }
    } else {
      throw new Error('Google sign-in was cancelled');
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};
