/**
 * GET /api/booking-providers
 * List booking provider integrations for the current tenant.
 * Query: ?provider=calcom to get status for a single provider (no credentials returned).
 *
 * POST /api/booking-providers
 * Create or update a booking provider integration (e.g. Cal.com API key).
 * Body: { provider: "calcom", credentials: { apiKey, apiUrl? }, settings?: {} }
 *
 * For Platform Admins (no tenant), we use the first available tenant so save/load works.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentTenant } from "@/core/multi-tenancy/server";

/** Resolve tenant ID: current user's tenant, or first tenant for Platform Admin. */
async function getTenantIdForBookingProviders(): Promise<string | null> {
  const tenantId = await getCurrentTenant();
  if (tenantId) return tenantId;
  const adminClient = createAdminClient();
  const { data: tenants } = await adminClient
    .from("tenants")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);
  const first = tenants?.[0] as { id: string } | undefined;
  return first?.id ?? null;
}

function validateAndNormalizeApiUrl(rawApiUrl?: string): { ok: true; value?: string } | { ok: false; message: string } {
  if (!rawApiUrl) return { ok: true };

  const trimmed = rawApiUrl.trim();
  if (!trimmed) return { ok: true };

  if (!/^https?:\/\//i.test(trimmed)) {
    return {
      ok: false,
      message: "API URL must include http:// or https:// (example: https://api.cal.com).",
    };
  }

  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname) {
      return { ok: false, message: "API URL is invalid. Please provide a valid host." };
    }
    return { ok: true, value: parsed.toString().replace(/\/$/, "") };
  } catch {
    return { ok: false, message: "API URL is invalid. Please provide a valid URL." };
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const tenantId = await getTenantIdForBookingProviders();
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "No tenant found. Create a tenant first." } },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const providerFilter = searchParams.get("provider");

    const adminClient = createAdminClient();
    let query = adminClient
      .from("booking_provider_integrations")
      .select("id, provider, listing_id, active, last_synced_at, last_sync_error, created_at, credentials")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (providerFilter) {
      query = query.eq("provider", providerFilter);
      // Platform-level integration: no specific listing
      if (providerFilter === "calcom") {
        query = query.is("listing_id", null);
      }
    }

    const { data: integrations, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    const list = (integrations || []) as Array<{ credentials?: unknown }>;
    // When asking for a single provider, return connected/hasCredentials without exposing secrets
    if (providerFilter && list.length > 0) {
      const first = list[0];
      const creds = first.credentials as Record<string, unknown> | null;
      const hasCredentials = !!creds && typeof creds.apiKey === "string" && creds.apiKey.length > 0;
      return NextResponse.json({
        integration: {
          id: (first as { id: string }).id,
          provider: (first as { provider: string }).provider,
          connected: hasCredentials,
          active: (first as { active: boolean }).active,
        },
      });
    }

    // List view: do not expose credentials
    const safe = list.map((i) => {
      const { credentials: _c, ...rest } = i;
      return rest;
    });
    return NextResponse.json({ integrations: safe });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const tenantId = await getTenantIdForBookingProviders();
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "No tenant found. Create a tenant first." } },
        { status: 400 }
      );
    }

    const body = await req.json();
    const provider = body?.provider as string;
    const credentials = body?.credentials as Record<string, unknown> | undefined;
    const settings = (body?.settings as Record<string, unknown>) ?? {};

    if (!provider || provider !== "calcom") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Only provider 'calcom' is supported for saving credentials" } },
        { status: 400 }
      );
    }

    const apiKey = credentials?.apiKey as string | undefined;
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "API Key is required" } },
        { status: 400 }
      );
    }

    const inputApiUrl =
      (credentials?.apiUrl as string | undefined) ||
      (credentials?.baseUrl as string | undefined);
    const apiUrlValidation = validateAndNormalizeApiUrl(inputApiUrl);
    if (!apiUrlValidation.ok) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: apiUrlValidation.message } },
        { status: 400 }
      );
    }
    const apiUrl = apiUrlValidation.value;
    const credentialsToStore = {
      apiKey: apiKey.trim(),
      ...(apiUrl ? { baseUrl: apiUrl, apiUrl } : {}),
    };

    const adminClient = createAdminClient();

    // Platform-level: listing_id null. Find existing row for this tenant + provider.
    const { data: existing } = await adminClient
      .from("booking_provider_integrations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("provider", "calcom")
      .is("listing_id", null)
      .maybeSingle();

    if (existing?.id) {
      const { error: updateError } = await adminClient
        .from("booking_provider_integrations")
        .update({
          credentials: credentialsToStore,
          settings,
          active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: { code: "DATABASE_ERROR", message: updateError.message } },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, integration: { id: existing.id, provider: "calcom" } });
    }

    const { data: inserted, error: insertError } = await adminClient
      .from("booking_provider_integrations")
      .insert({
        tenant_id: tenantId,
        user_id: user.id,
        listing_id: null,
        provider: "calcom",
        credentials: credentialsToStore,
        settings,
        active: true,
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: insertError.message } },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      integration: { id: (inserted as { id: string }).id, provider: "calcom" },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/booking-providers
 * Disconnect a provider (set active: false). Body: { provider: "calcom" }
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const tenantId = await getTenantIdForBookingProviders();
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "No tenant found. Create a tenant first." } },
        { status: 400 }
      );
    }

    const body = await req.json();
    const provider = body?.provider as string;
    if (!provider || provider !== "calcom") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Provider is required" } },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
      .from("booking_provider_integrations")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("provider", "calcom")
      .is("listing_id", null);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: updateError.message } },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
