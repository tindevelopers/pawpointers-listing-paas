import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL is required');
}

// Non-null assertion after validation
const SUPABASE_URL = supabaseUrl;

/**
 * Create a Supabase client with service role (admin) privileges
 * Use this for server-side operations that bypass RLS
 */
export function createAdminClient(): SupabaseClient {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_KEY is required for admin client');
  }
  
  return createClient(SUPABASE_URL, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase client with anon key
 * Use this for public operations or when you want RLS to apply
 */
export function createAnonClient() {
  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY is required for anon client');
  }
  
  return createClient(SUPABASE_URL, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase client with a user's JWT token
 * This applies RLS policies based on the authenticated user
 */
export function createUserClient(accessToken: string): SupabaseClient {
  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY is required for user client');
  }
  
  return createClient(SUPABASE_URL, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

// Singleton admin client for reuse
let adminClientInstance: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!adminClientInstance) {
    adminClientInstance = createAdminClient();
  }
  return adminClientInstance;
}


