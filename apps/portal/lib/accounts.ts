/**
 * Account/User Data Fetching Helpers
 * 
 * Functions to fetch account/tenant information for showcasing on the portal
 */

export interface FeaturedAccount {
  id: string;
  name: string;
  domain: string;
  description?: string;
  plan: string;
  avatar_url?: string;
  created_at: string;
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const urlStatus = SUPABASE_URL ? 'SET' : 'MISSING';
    const keyStatus = SUPABASE_ANON_KEY ? 'SET' : 'MISSING';
    throw new Error(
      `Missing Supabase environment variables in apps/portal. ` +
      `NEXT_PUBLIC_SUPABASE_URL: ${urlStatus}, ` +
      `NEXT_PUBLIC_SUPABASE_ANON_KEY: ${keyStatus}. ` +
      `Please create apps/portal/.env.local with these variables and restart the dev server.`
    );
  }
  if (!_supabase) _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _supabase;
}

function hasSupabase(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Fetch featured accounts/tenants
 * Uses the public API endpoint (no auth required)
 */
export async function getFeaturedAccounts(limit: number = 4): Promise<FeaturedAccount[]> {
  if (!hasSupabase()) return [];
  try {
    const { data, error } = await getSupabase()
      .from('tenants')
      .select('id, name, domain, avatar_url, plan, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch accounts from Supabase:', error.message);
      return [];
    }

    if (!data) {
      return [];
    }

    const accounts = data as Array<{
      id: string;
      name: string;
      domain: string;
      avatar_url: string | null;
      plan: string | null;
      created_at: string;
    }>;

    return accounts.map((account) => ({
      id: account.id,
      name: account.name,
      domain: account.domain,
      description: `${account.name} - Quality services you can trust`,
      plan: account.plan || 'starter',
      avatar_url: account.avatar_url,
      created_at: account.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching featured accounts:', error);
    return [];
  }
}
