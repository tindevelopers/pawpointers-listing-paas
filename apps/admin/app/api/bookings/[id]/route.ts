import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentTenant } from "@/core/multi-tenancy/server";
import { getUserPermissions } from "@/core/permissions/permissions";

/**
 * GET /api/bookings/[id]
 * Get a single booking by ID
 */
export async function GET(
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
    const hasBookingRead = permissions.isPlatformAdmin || 
      permissions.permissions.includes("bookings.read") ||
      permissions.permissions.includes("bookings.*");

    if (!hasBookingRead) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        { status: 403 }
      );
    }

    const tenantId = await getCurrentTenant();
    const adminClient = createAdminClient();

    let query = adminClient
      .from("bookings")
      .select(`
        *,
        event_types:event_type_id(id, name, slug, booking_type, video_provider),
        team_members:team_member_id(id, user_id, round_robin_enabled)
      `)
      .eq("id", params.id)
      .single();

    // Apply tenant filter unless platform admin
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data: booking, error } = await query;

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Booking not found" } },
          { status: 404 }
        );
      }
      console.error("[GET /api/bookings/[id]] Database error:", error);
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    // Return snake_case format - hooks will transform to camelCase
    return NextResponse.json(booking);
  } catch (error: any) {
    console.error("[GET /api/bookings/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

