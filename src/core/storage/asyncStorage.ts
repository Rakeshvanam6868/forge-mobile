import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * A wrapper for AsyncStorage to be used by the Supabase client
 * for persisting user sessions.
 */
export const supabaseStorage = {
  getItem: (key: string) => {
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    return AsyncStorage.removeItem(key);
  },
};
