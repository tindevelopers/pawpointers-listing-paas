import { NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import {
  getScopedListingIds,
  getDashboardEntitlementsForUser,
} from "@/lib/listing-access";
import { canAccessDashboardFeature } from "@/lib/subscription-entitlements";

/**
 * GET /api/bookings
 * Returns bookings for the merchant's listings (same data as /bookings page).
 * Used for API smoke tests and future integrations.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const listingIds = await getScopedListingIds(user.id);
    const entitlements = await getDashboardEntitlementsForUser(user.id);
    const canAccessBookings = canAccessDashboardFeature(entitlements, "bookings");
    if (!canAccessBookings) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Bookings feature not available" } },
        { status: 403 }
      );
    }

    let bookings: Array<{
      id: string;
      listing_id: string;
      status: string;
      start_date: string;
      end_date: string;
      start_time?: string;
      end_time?: string;
      total_amount: number;
      currency: string;
      confirmation_code?: string;
      internal_notes?: string;
      created_at: string;
      listings?: { id: string; title: string; slug: string } | null;
    }> = [];

    if (listingIds.length > 0) {
      const { data } = await supabase
        .from("bookings")
        .select(
          "id, listing_id, status, start_date, end_date, start_time, end_time, total_amount, currency, confirmation_code, internal_notes, created_at, listings(id, title, slug)"
        )
        .in("listing_id", listingIds)
        .order("start_date", { ascending: true });

      bookings = (data || []) as typeof bookings;
    }

    return NextResponse.json({
      success: true,
      data: { bookings },
    });
  } catch (error) {
    console.error("[GET /api/bookings] Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch bookings";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
