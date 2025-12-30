import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentTenant } from "@/core/multi-tenancy/server";
import { getUserPermissions } from "@/core/permissions/permissions";

/**
 * POST /api/bookings/[id]/cancel
 * Cancel a booking
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    // Check permissions
    const permissions = await getUserPermissions(user.id);
    const hasBookingWrite = permissions.isPlatformAdmin || 
      permissions.permissions.includes("bookings.write") ||
      permissions.permissions.includes("bookings.*");

    if (!hasBookingWrite) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        { status: 403 }
      );
    }

    const tenantId = await getCurrentTenant();
    const adminClient = createAdminClient();

    // Get the booking first
    let query = adminClient
      .from("bookings")
      .select("*")
      .eq("id", params.id)
      .single();

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data: booking, error: fetchError } = await query;

    if (fetchError || !booking) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Booking not found" } },
        { status: 404 }
      );
    }

    // Check if booking can be cancelled
    if (booking.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Booking is already cancelled" } },
        { status: 400 }
      );
    }

    if (booking.status === "completed") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Cannot cancel a completed booking" } },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { reason } = body;

    // Calculate refund amount (full refund for now)
    const refundAmount = booking.payment_status === "paid" ? parseFloat(booking.total_amount || 0) : 0;

    // Update booking
    const { data: updatedBooking, error: updateError } = await adminClient
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        cancellation_reason: reason,
        refund_amount: refundAmount,
        payment_status: refundAmount > 0 ? "refunded" : booking.payment_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single();

    if (updateError) {
      console.error("[POST /api/bookings/[id]/cancel] Database error:", updateError);
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: updateError.message } },
        { status: 500 }
      );
    }

    // Return snake_case format - hooks will transform to camelCase
    return NextResponse.json(updatedBooking);
  } catch (error: any) {
    console.error("[POST /api/bookings/[id]/cancel] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

