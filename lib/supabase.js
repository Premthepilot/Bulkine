import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create client lazily to avoid build-time errors
let supabaseClient = null;

export const supabase = {
  get auth() {
    if (!supabaseClient) {
      if (!supabaseUrl || !supabaseAnonKey) {
        // Return a mock auth object during build or when not configured
        return {
          getSession: async () => ({ data: { session: null }, error: null }),
          signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase not configured. Please set environment variables.' } }),
          signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase not configured. Please set environment variables.' } }),
          signOut: async () => ({ error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        };
      }
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    }
    return supabaseClient.auth;
  },
};

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};
