/**
 * GET /api/booking-providers/:id/health
 * Health check for a booking provider integration
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentTenant } from "@/core/multi-tenancy/server";
import { createBookingProvider } from "@listing-platform/booking/providers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const adminClient = createAdminClient();

    const { data: integration, error } = await adminClient
      .from("booking_provider_integrations")
      .select("id, provider, credentials, settings, tenant_id")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !integration) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Integration not found" } },
        { status: 404 }
      );
    }

    const provider = createBookingProvider(
      integration.provider as "builtin" | "gohighlevel" | "calcom",
      adminClient as any
    );

    const context = {
      supabase: adminClient as any,
      tenantId,
      providerCredentials: integration.credentials as Record<string, unknown>,
      providerSettings: integration.settings as Record<string, unknown>,
    };

    const health = await provider.healthCheck(context);

    return NextResponse.json({
      healthy: health.healthy,
      error: health.error,
      provider: integration.provider,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
