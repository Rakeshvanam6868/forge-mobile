import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { supabaseStorage } from '../storage/asyncStorage';

const supabaseUrl =process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
  console.warn(
    '[Supabase] EXPO_PUBLIC_SUPABASE_URL is missing. Please create a .env file with your project URL.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
