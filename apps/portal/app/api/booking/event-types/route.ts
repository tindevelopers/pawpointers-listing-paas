import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { withRateLimit } from "@/middleware/api-rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/booking/event-types?listingId=...
 * Returns active event types for a listing (for portal booking modal).
 * Public: no auth required.
 */
async function handler(request: NextRequest) {
  const listingId = request.nextUrl.searchParams.get("listingId");
  if (!listingId) {
    return NextResponse.json(
      { success: false, error: "listingId is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: eventTypes, error } = await supabase
      .from("event_types")
      .select("id, name, slug, duration_minutes, price, currency")
      .eq("listing_id", listingId)
      .eq("active", true)
      .order("duration_minutes", { ascending: true });

    if (error) {
      console.error("[GET /api/booking/event-types] Error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { eventTypes: eventTypes || [] },
    });
  } catch (err) {
    console.error("[GET /api/booking/event-types] Error:", err);
    const msg = err instanceof Error ? err.message : "Failed to fetch event types";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export const GET = withRateLimit(handler, "/api/booking/event-types");
