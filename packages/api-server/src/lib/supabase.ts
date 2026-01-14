import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables - trim whitespace/newlines
const supabaseUrlRaw = process.env.SUPABASE_URL;
const supabaseServiceKeyRaw = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKeyRaw = process.env.SUPABASE_ANON_KEY;

// #region agent log
const urlHasTrailingWhitespace = supabaseUrlRaw && (supabaseUrlRaw !== supabaseUrlRaw.trim());
const serviceKeyHasTrailingWhitespace = supabaseServiceKeyRaw && (supabaseServiceKeyRaw !== supabaseServiceKeyRaw.trim());
const anonKeyHasTrailingWhitespace = supabaseAnonKeyRaw && (supabaseAnonKeyRaw !== supabaseAnonKeyRaw.trim());
console.log('[DEBUG] Env vars check (raw):', {
  hasSupabaseUrl: !!supabaseUrlRaw,
  hasServiceKey: !!supabaseServiceKeyRaw,
  hasAnonKey: !!supabaseAnonKeyRaw,
  urlLength: supabaseUrlRaw?.length || 0,
  serviceKeyLength: supabaseServiceKeyRaw?.length || 0,
  anonKeyLength: supabaseAnonKeyRaw?.length || 0,
  urlHasTrailingWhitespace,
  serviceKeyHasTrailingWhitespace,
  anonKeyHasTrailingWhitespace,
  urlLastChar: supabaseUrlRaw ? JSON.stringify(supabaseUrlRaw.slice(-5)) : 'missing',
  serviceKeyLastChar: supabaseServiceKeyRaw ? JSON.stringify(supabaseServiceKeyRaw.slice(-5)) : 'missing',
  urlPrefix: supabaseUrlRaw?.substring(0, 30) || 'missing'
});
fetch('http://127.0.0.1:7248/ingest/eed908bc-e684-48e5-ad88-bbd7eba2f91e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:10',message:'Env vars check (raw)',data:{hasSupabaseUrl:!!supabaseUrlRaw,hasServiceKey:!!supabaseServiceKeyRaw,hasAnonKey:!!supabaseAnonKeyRaw,urlLength:supabaseUrlRaw?.length||0,serviceKeyLength:supabaseServiceKeyRaw?.length||0,anonKeyLength:supabaseAnonKeyRaw?.length||0,urlHasTrailingWhitespace,serviceKeyHasTrailingWhitespace,anonKeyHasTrailingWhitespace,urlLastChar:supabaseUrlRaw?JSON.stringify(supabaseUrlRaw.slice(-5)):'missing',serviceKeyLastChar:supabaseServiceKeyRaw?JSON.stringify(supabaseServiceKeyRaw.slice(-5)):'missing',urlPrefix:supabaseUrlRaw?.substring(0,30)||'missing'},timestamp:Date.now(),sessionId:'debug-session',runId:'init',hypothesisId:'A,B,C,D'})}).catch(()=>{});
// #endregion

// Trim whitespace and newlines from env vars
const supabaseUrl = supabaseUrlRaw?.trim();
const supabaseServiceKey = supabaseServiceKeyRaw?.trim();
const supabaseAnonKey = supabaseAnonKeyRaw?.trim();

// #region agent log
console.log('[DEBUG] Env vars check (trimmed):', {
  hasSupabaseUrl: !!supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  hasAnonKey: !!supabaseAnonKey,
  urlLength: supabaseUrl?.length || 0,
  serviceKeyLength: supabaseServiceKey?.length || 0,
  anonKeyLength: supabaseAnonKey?.length || 0,
  urlPrefix: supabaseUrl?.substring(0, 30) || 'missing'
});
fetch('http://127.0.0.1:7248/ingest/eed908bc-e684-48e5-ad88-bbd7eba2f91e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:25',message:'Env vars check (trimmed)',data:{hasSupabaseUrl:!!supabaseUrl,hasServiceKey:!!supabaseServiceKey,hasAnonKey:!!supabaseAnonKey,urlLength:supabaseUrl?.length||0,serviceKeyLength:supabaseServiceKey?.length||0,anonKeyLength:supabaseAnonKey?.length||0,urlPrefix:supabaseUrl?.substring(0,30)||'missing'},timestamp:Date.now(),sessionId:'debug-session',runId:'init',hypothesisId:'A,B,C,D'})}).catch(()=>{});
// #endregion

// Use trimmed URL (may be undefined if env var is missing)
// Don't throw at module load - validate when client is actually created
const SUPABASE_URL = supabaseUrl || '';

/**
 * Create a Supabase client with service role (admin) privileges
 * Use this for server-side operations that bypass RLS
 */
export function createAdminClient(): SupabaseClient {
  // #region agent log
  fetch('http://127.0.0.1:7248/ingest/eed908bc-e684-48e5-ad88-bbd7eba2f91e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:22',message:'createAdminClient called',data:{hasServiceKey:!!supabaseServiceKey,hasUrl:!!supabaseUrl,urlPrefix:supabaseUrl?.substring(0,30)||'missing'},timestamp:Date.now(),sessionId:'debug-session',runId:'init',hypothesisId:'B,D'})}).catch(()=>{});
  // #endregion

  if (!supabaseUrl) {
    const error = new Error('SUPABASE_URL is required');
    console.error('[ERROR]', error.message);
    // #region agent log
    fetch('http://127.0.0.1:7248/ingest/eed908bc-e684-48e5-ad88-bbd7eba2f91e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:52',message:'Missing SUPABASE_URL in createAdminClient',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'runtime',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    throw error;
  }

  if (!supabaseServiceKey) {
  // #region agent log
  console.error('[ERROR] Missing SUPABASE_SERVICE_KEY');
  fetch('http://127.0.0.1:7248/ingest/eed908bc-e684-48e5-ad88-bbd7eba2f91e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:60',message:'Missing SUPABASE_SERVICE_KEY',data:{error:'SUPABASE_SERVICE_KEY is required for admin client'},timestamp:Date.now(),sessionId:'debug-session',runId:'runtime',hypothesisId:'B,D'})}).catch(()=>{});
  // #endregion
    throw new Error('SUPABASE_SERVICE_KEY is required for admin client');
  }
  
  try {
    const client = createClient(SUPABASE_URL, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    // #region agent log
    fetch('http://127.0.0.1:7248/ingest/eed908bc-e684-48e5-ad88-bbd7eba2f91e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:35',message:'Admin client created successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'init',hypothesisId:'B,D'})}).catch(()=>{});
    // #endregion
    return client;
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7248/ingest/eed908bc-e684-48e5-ad88-bbd7eba2f91e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:40',message:'Failed to create admin client',data:{error:err instanceof Error?err.message:String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'init',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    throw err;
  }
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
  // #region agent log
  fetch('http://127.0.0.1:7248/ingest/eed908bc-e684-48e5-ad88-bbd7eba2f91e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:78',message:'getAdminClient called',data:{hasInstance:!!adminClientInstance},timestamp:Date.now(),sessionId:'debug-session',runId:'runtime',hypothesisId:'B,D'})}).catch(()=>{});
  // #endregion
  
  if (!adminClientInstance) {
    try {
      adminClientInstance = createAdminClient();
      // #region agent log
      fetch('http://127.0.0.1:7248/ingest/eed908bc-e684-48e5-ad88-bbd7eba2f91e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:82',message:'Admin client instance created',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'runtime',hypothesisId:'B,D'})}).catch(()=>{});
      // #endregion
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7248/ingest/eed908bc-e684-48e5-ad88-bbd7eba2f91e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.ts:86',message:'Failed to create admin client instance',data:{error:err instanceof Error?err.message:String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'runtime',hypothesisId:'B,D,E'})}).catch(()=>{});
      // #endregion
      throw err;
    }
  }
  return adminClientInstance;
}


