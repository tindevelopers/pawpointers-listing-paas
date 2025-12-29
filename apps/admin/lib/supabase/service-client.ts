import "server-only";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

type ServiceClient = SupabaseClient<any, "public", any>;

export function getSupabaseServiceClient(): ServiceClient | null {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

