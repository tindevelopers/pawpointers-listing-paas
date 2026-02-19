import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { createBookingProvider } from "@listing-platform/booking/providers";
import { withRateLimit } from "@/middleware/api-rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/booking/create
 * Create a booking for a listing (portal consumer flow)
 */
async function handler(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      listingId,
      listing_id,
      eventTypeId,
      event_type_id,
      startDate,
      start_date,
      endDate,
      end_date,
      startTime,
      start_time,
      endTime,
      end_time,
      guestCount = 1,
      guest_count,
      guestDetails,
      guest_details,
      specialRequests,
      special_requests,
    } = body;

    const lid = listingId || listing_id;
    const start = startDate || start_date;
    const end = endDate || end_date;
    const st = startTime || start_time;
    const et = endTime || end_time;
    const gc = guestCount ?? guest_count ?? 1;
    const gd = guestDetails || guest_details;
    const sr = specialRequests || special_requests;

    if (!lid || !start || !end) {
      return NextResponse.json(
        { success: false, error: "listingId, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    if (new Date(end) < new Date(start)) {
      return NextResponse.json(
        { success: false, error: "endDate must be after startDate" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { data: listing } = await adminClient
      .from("listings")
      .select("id, tenant_id, booking_provider_id")
      .eq("id", lid)
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
    if ((listing as { booking_provider_id?: string }).booking_provider_id) {
      const { data: integration } = await adminClient
        .from("booking_provider_integrations")
        .select("provider")
        .eq("id", (listing as { booking_provider_id: string }).booking_provider_id)
        .single();
      if (integration?.provider) {
        providerType = integration.provider as "builtin" | "gohighlevel" | "calcom";
      }
    }

    const evtId = eventTypeId || event_type_id;
    let basePrice = 0;
    let currency = "USD";
    if (evtId) {
      const { data: eventType } = await adminClient
        .from("event_types")
        .select("price, currency")
        .eq("id", evtId)
        .single();
      if (eventType) {
        basePrice = (eventType as { price?: number }).price || 0;
        currency = (eventType as { currency?: string }).currency || "USD";
      }
    }
    const serviceFee = basePrice * 0.1;
    const taxAmount = (basePrice + serviceFee) * 0.08;
    const totalAmount = basePrice + serviceFee + taxAmount;

    if (providerType === "calcom") {
      const { data: integrations } = await adminClient
        .from("booking_provider_integrations")
        .select("id, credentials, settings, listing_id")
        .eq("tenant_id", tenantId)
        .eq("provider", "calcom")
        .eq("active", true);
      const integration =
        (integrations || []).find(
          (i: { listing_id?: string | null }) => i.listing_id === lid
        ) ??
        (integrations || []).find(
          (i: { listing_id?: string | null }) => i.listing_id == null
        ) ??
        (integrations || [])[0];

      if (!integration?.credentials) {
        return NextResponse.json(
          {
            success: false,
            error: "Cal.com integration not configured for this listing",
          },
          { status: 400 }
        );
      }

      const bookProvider = createBookingProvider("calcom", adminClient as any);
      const context = {
        supabase: adminClient as any,
        tenantId,
        listingId: lid,
        userId: user.id,
        providerCredentials: integration.credentials as Record<string, unknown>,
        providerSettings: integration.settings as Record<string, unknown>,
      };
      const result = await bookProvider.createBooking(context, {
        listingId: lid,
        eventTypeId: evtId,
        userId: user.id,
        tenantId,
        startDate: start,
        endDate: end,
        startTime: st,
        endTime: et,
        guestCount: gc,
        guestDetails: gd,
        specialRequests: sr,
        basePrice,
        serviceFee,
        taxAmount,
        totalAmount,
        currency,
      });

      const b = result.booking as Record<string, unknown>;
      return NextResponse.json({
        success: true,
        data: { bookingId: b.id, booking: b },
      });
    }

    const provider = createBookingProvider("builtin", adminClient as any);
    const result = await provider.createBooking(
      {
        supabase: adminClient as any,
        tenantId,
        listingId: lid,
        userId: user.id,
      },
      {
        listingId: lid,
        eventTypeId: evtId,
        userId: user.id,
        tenantId,
        startDate: start,
        endDate: end,
        startTime: st,
        endTime: et,
        guestCount: gc,
        guestDetails: gd,
        specialRequests: sr,
        basePrice,
        serviceFee,
        taxAmount,
        totalAmount,
        currency,
      }
    );

    const b = result.booking as Record<string, unknown>;
    return NextResponse.json({
      success: true,
      data: { bookingId: b.id, booking: b },
    });
  } catch (error: unknown) {
    console.error("[POST /api/booking/create] Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create booking";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export const POST = withRateLimit(handler, "/api/booking/create");
