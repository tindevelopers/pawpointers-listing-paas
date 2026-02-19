/**
 * GET /api/booking-providers
 * List booking provider integrations for the current tenant
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentTenant } from "@/core/multi-tenancy/server";

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

    const tenantId = await getCurrentTenant();
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Tenant context required" } },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { data: integrations, error } = await adminClient
      .from("booking_provider_integrations")
      .select("id, provider, listing_id, active, last_synced_at, last_sync_error, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ integrations: integrations || [] });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
