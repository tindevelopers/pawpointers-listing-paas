import "server-only";

import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

export type ProviderRoutingRow = {
  capability: string;
  primary_provider: string;
  fallback_provider: string | null;
  enabled: boolean;
  incident_mode: boolean;
  rollout_percent: number;
  allowlist_tenants: string[] | null;
  denylist_tenants: string[] | null;
  updated_at: string;
};

type CacheEntry<T> = { value: T; expiresAt: number };

function getCacheStore(): Map<string, CacheEntry<any>> {
  const g = globalThis as any;
  if (!g.__providerRoutingCache) g.__providerRoutingCache = new Map();
  return g.__providerRoutingCache as Map<string, CacheEntry<any>>;
}

function nowMs() {
  return Date.now();
}

function staffSupabaseClient() {
  const url = process.env.STAFF_SUPABASE_URL;
  const key = process.env.STAFF_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing STAFF_SUPABASE_URL or STAFF_SUPABASE_SERVICE_ROLE_KEY (server-only)."
    );
  }
  return createSupabaseJsClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getProviderRoutingForCapability(
  capability: string,
  opts?: { ttlMs?: number }
): Promise<ProviderRoutingRow | null> {
  const ttlMs = opts?.ttlMs ?? 60_000;
  const cacheKey = `provider_routing:${capability}`;
  const cache = getCacheStore();
  const existing = cache.get(cacheKey);
  if (existing && existing.expiresAt > nowMs()) return existing.value;

  const supabase = staffSupabaseClient();
  const { data, error } = await supabase
    .from("provider_routing")
    .select(
      "capability,primary_provider,fallback_provider,enabled,incident_mode,rollout_percent,allowlist_tenants,denylist_tenants,updated_at"
    )
    .eq("capability", capability)
    .maybeSingle();

  if (error) {
    // Fail open to “no config” and let callers fall back to a hard default.
    return null;
  }

  cache.set(cacheKey, { value: (data as any) ?? null, expiresAt: nowMs() + ttlMs });
  return (data as any) ?? null;
}

export function pickProviderFromRouting(
  routing: ProviderRoutingRow | null,
  opts?: { tenantId?: string }
): { provider: string | null; reason: string } {
  if (!routing) return { provider: null, reason: "no_routing_config" };
  if (!routing.enabled) return { provider: null, reason: "disabled" };
  if (routing.incident_mode && routing.fallback_provider) {
    return { provider: routing.fallback_provider, reason: "incident_mode_fallback" };
  }
  const tenantId = opts?.tenantId;
  if (tenantId && routing.denylist_tenants?.includes(tenantId)) {
    return { provider: routing.fallback_provider ?? routing.primary_provider, reason: "tenant_denylisted" };
  }
  if (tenantId && routing.allowlist_tenants && !routing.allowlist_tenants.includes(tenantId)) {
    return { provider: routing.fallback_provider ?? routing.primary_provider, reason: "tenant_not_allowlisted" };
  }
  return { provider: routing.primary_provider, reason: "primary" };
}

