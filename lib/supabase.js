import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a single Supabase client instance
let supabaseClient = null;

const getSupabaseClient = () => {
  if (!supabaseClient && supabaseUrl && supabaseAnonKey) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return supabaseClient;
};

// Mock client for build-time or unconfigured state
const mockAuth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  getUser: async () => ({ data: { user: null }, error: null }),
  signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase not configured.' } }),
  signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase not configured.' } }),
  signOut: async () => ({ error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
};

// Export the Supabase client - use direct client reference to ensure auth state consistency
export const supabase = {
  get auth() {
    const client = getSupabaseClient();
    return client ? client.auth : mockAuth;
  },

  from(table) {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase not configured. Please set environment variables.');
    }
    return client.from(table);
  },

  get client() {
    return getSupabaseClient();
  }
};

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Helper to verify active session before database operations
export const verifySession = async () => {
  const client = getSupabaseClient();
  if (!client) {
    console.error('[verifySession] Supabase client not configured');
    return { session: null, user: null, error: 'Client not configured' };
  }

  const { data: { session }, error: sessionError } = await client.auth.getSession();

  if (sessionError) {
    console.error('[verifySession] Session error:', sessionError.message);
    return { session: null, user: null, error: sessionError.message };
  }

  if (!session) {
    console.error('[verifySession] No active session');
    return { session: null, user: null, error: 'No active session' };
  }

  console.log('[verifySession] Active session found:', {
    userId: session.user?.id,
    email: session.user?.email,
    expiresAt: session.expires_at
  });

  return { session, user: session.user, error: null };
};
