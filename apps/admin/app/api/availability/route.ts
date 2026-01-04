import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentTenant } from "@/core/multi-tenancy/server";
import { getUserPermissions } from "@/core/permissions/permissions";

/**
 * GET /api/availability
 * Get availability slots for listings
 */
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

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const listingId = searchParams.get("listingId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const availableOnly = searchParams.get("availableOnly") === "true";

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "startDate and endDate are required" } },
        { status: 400 }
      );
    }

    // Build query
    let query = adminClient
      .from("availability_slots")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    // Apply tenant filter
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    // Apply listing filter
    if (listingId) {
      query = query.eq("listing_id", listingId);
    }

    // Apply availability filter
    if (availableOnly) {
      query = query.eq("available", true);
    }

    const { data: slots, error } = await query;

    if (error) {
      console.error("[GET /api/availability] Database error:", error);
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    // Return snake_case format - hooks will transform to camelCase
    return NextResponse.json({
      slots: slots || [],
    });
  } catch (error: any) {
    console.error("[GET /api/availability] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/availability
 * Create or update availability slots
 */
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
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Tenant context required" } },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      listing_id,
      date,
      start_time,
      end_time,
      available = true,
      max_bookings = 1,
      price,
      min_duration,
      max_duration,
      notes,
    } = body;

    // Validation
    if (!listing_id || !date) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "listing_id and date are required" } },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    
    // Use upsert to create or update
    const { data: slot, error } = await adminClient
      .from("availability_slots")
      .upsert({
        listing_id,
        tenant_id: tenantId,
        date,
        start_time,
        end_time,
        available,
        max_bookings,
        price,
        min_duration,
        max_duration,
        notes,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "listing_id,date,start_time",
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/availability] Database error:", error);
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    // Return snake_case format - hooks will transform to camelCase
    return NextResponse.json(slot, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/availability] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

