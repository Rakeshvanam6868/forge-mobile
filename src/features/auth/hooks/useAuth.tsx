import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from '../../../core/supabase/client';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle incoming deep links (e.g. email confirmation, OAuth)
  const handleDeepLink = async (url: string | null) => {
    if (!url) return;
    try {
      // Supabase parses the fragment (#) for access_token, refresh_token
      // React Native sometimes receives it as a query (?), so we replace it
      const parsedUrl = new URL(url.replace('#', '?'));
      const accessToken = parsedUrl.searchParams.get('access_token');
      const refreshToken = parsedUrl.searchParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) console.error('[AuthProvider] setSession error:', error.message);
      }
    } catch (e) {
      console.warn('[handleDeepLink] Failed parsing URL', e);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Check initial deep link on cold start
    Linking.getInitialURL().then(handleDeepLink);

    // Listen to deep links while app is open in background
    const linkingSub = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Check active sessions and sets the user
    supabase.auth.getSession().then((response) => {
      if (mounted) {
        if (response.error) {
          console.warn('[AuthProvider] getSession error:', response.error.message);
          setSession(null);
        } else {
          setSession(response.data.session);
        }
        setLoading(false);
      }
    }).catch((err) => {
      console.error('[AuthProvider] getSession exception:', err);
      if (mounted) {
        setSession(null);
        setLoading(false);
      }
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: any, currentSession: Session | null) => {
        if (mounted && _event !== 'INITIAL_SESSION') {
          setSession(currentSession);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  const value = {
    session,
    user: session?.user || null,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
