import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants';

const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

// Real Supabase client (also used as the type reference)
const realSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS !== 'web' ? ExpoSecureStoreAdapter : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type SupabaseClient = typeof realSupabase;

function buildClient(): SupabaseClient {
  if (USE_MOCK) {
    if (__DEV__) console.log('[supabase] Mock mode - using in-memory backend');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mockSupabase } = require('./supabaseMock');
    return mockSupabase as SupabaseClient;
  }
  return realSupabase;
}

export const supabase: SupabaseClient = buildClient();
