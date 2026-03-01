import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { createBookingProvider } from "@listing-platform/booking/providers";
import { withRateLimit } from "@/middleware/api-rate-limit";

export const dynamic = "force-dynamic";

function getAdminClientOrNull(): ReturnType<typeof createAdminClient> | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/** Consumer-facing availability: use anon/user client when possible; admin only for Cal.com credentials. */
async function handler(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const listingId = searchParams.get("listingId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (!listingId || !dateFrom || !dateTo) {
    return NextResponse.json(
      { success: false, error: "Missing required parameters: listingId, dateFrom, dateTo" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: listing } = await supabase
      .from("listings")
      .select("id, tenant_id, booking_provider_id")
      .eq("id", listingId)
      .single();

    if (!listing) {
      return NextResponse.json(
        { success: false, error: "Listing not found" },
        { status: 404 }
      );
    }

    const tenantId = (listing as { tenant_id?: string }).tenant_id;
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "Listing has no tenant" },
        { status: 400 }
      );
    }

    let providerType: "builtin" | "gohighlevel" | "calcom" = "builtin";
    const bookingProviderId = (listing as { booking_provider_id?: string }).booking_provider_id;
    if (bookingProviderId) {
      const adminClient = getAdminClientOrNull();
      if (adminClient) {
        const { data: integration } = await adminClient
          .from("booking_provider_integrations")
          .select("provider")
          .eq("id", bookingProviderId)
          .single();
        const provider = (integration as { provider?: string } | null)?.provider;
        if (provider) {
          providerType = provider as "builtin" | "gohighlevel" | "calcom";
        }
      }
    }

    let context: Record<string, unknown> = {
      supabase,
      tenantId,
      listingId,
    };

    if (providerType === "calcom") {
      const adminClient = getAdminClientOrNull();
      if (!adminClient) {
        return NextResponse.json(
          { success: false, error: "Cal.com availability is not configured. Set SUPABASE_SERVICE_ROLE_KEY for this listing." },
          { status: 503 }
        );
      }
      const { data: integrations } = await adminClient
        .from("booking_provider_integrations")
        .select("id, credentials, settings, listing_id")
        .eq("tenant_id", tenantId)
        .eq("provider", "calcom")
        .eq("active", true);
      const integrationsList =
        ((integrations || []) as Array<{
          id: string;
          credentials?: Record<string, unknown> | null;
          settings?: Record<string, unknown> | null;
          listing_id?: string | null;
        }>);
      const integration =
        integrationsList.find(
          (i: { listing_id?: string | null }) => i.listing_id === listingId
        ) ??
        integrationsList.find(
          (i: { listing_id?: string | null }) => i.listing_id == null
        ) ??
        integrationsList[0];

      if (integration?.credentials) {
        context.providerCredentials = integration.credentials as Record<string, unknown>;
        context.providerSettings = integration.settings as Record<string, unknown>;
      }
      context.supabase = adminClient;
    }

    const provider = createBookingProvider(providerType, (context.supabase as any) as any);
    const slots = await provider.getAvailability(
      context as any,
      new Date(dateFrom),
      new Date(dateTo)
    );

    return NextResponse.json({
      success: true,
      data: { slots },
    });
  } catch (error: unknown) {
    console.error("Availability check error:", error);
    const msg = error instanceof Error ? error.message : "Failed to check availability";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handler, "/api/booking/availability");
