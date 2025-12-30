import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentTenant } from "@/core/multi-tenancy/server";
import { getUserPermissions } from "@/core/permissions/permissions";

/**
 * GET /api/bookings
 * List bookings with filters
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

    // Get tenant context
    const tenantId = await getCurrentTenant();
    const adminClient = createAdminClient();

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const listingId = searchParams.get("listingId");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build query
    let query = adminClient
      .from("bookings")
      .select("*", { count: "exact" })
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    // Apply tenant filter (unless platform admin viewing all)
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    // Apply filters
    if (status) {
      const statuses = status.split(",");
      if (statuses.length === 1) {
        query = query.eq("status", statuses[0]);
      } else {
        query = query.in("status", statuses);
      }
    }

    if (paymentStatus) {
      const paymentStatuses = paymentStatus.split(",");
      if (paymentStatuses.length === 1) {
        query = query.eq("payment_status", paymentStatuses[0]);
      } else {
        query = query.in("payment_status", paymentStatuses);
      }
    }

    if (listingId) {
      query = query.eq("listing_id", listingId);
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (startDate) {
      query = query.gte("start_date", startDate);
    }

    if (endDate) {
      query = query.lte("end_date", endDate);
    }

    const { data: bookings, error, count } = await query;

    if (error) {
      console.error("[GET /api/bookings] Database error:", error);
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    // Return snake_case format - hooks will transform to camelCase
    return NextResponse.json({
      bookings: bookings || [],
      total: count || 0,
      meta: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/bookings] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings
 * Create a new booking
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
      event_type_id,
      start_date,
      end_date,
      start_time,
      end_time,
      guest_count = 1,
      guest_details,
      special_requests,
      payment_method_id,
      timezone,
      form_responses,
      video_provider,
    } = body;

    // Validation - either listing_id or event_type_id must be provided
    if ((!listing_id && !event_type_id) || !start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Either listing_id or event_type_id, start_date, and end_date are required" } },
        { status: 400 }
      );
    }

    if (new Date(end_date) < new Date(start_date)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "end_date must be after start_date" } },
        { status: 400 }
      );
    }

    // Generate confirmation code
    const confirmationCode = `BK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Get event type if provided to calculate pricing
    let basePrice = 0;
    let currency = "USD";
    let teamMemberId = null;
    
    if (event_type_id) {
      const { data: eventType } = await adminClient
        .from("event_types")
        .select("*")
        .eq("id", event_type_id)
        .single();
      
      if (eventType) {
        basePrice = eventType.price || 0;
        currency = eventType.currency || "USD";
        
        // Round robin assignment would happen here via API server
        // For now, we'll let the API server handle it
      }
    }

    // Calculate pricing
    const serviceFee = basePrice * 0.1; // 10% service fee
    const taxAmount = (basePrice + serviceFee) * 0.08; // 8% tax
    const totalAmount = basePrice + serviceFee + taxAmount;

    const adminClient = createAdminClient();
    const bookingData: any = {
      listing_id: listing_id || null,
      event_type_id: event_type_id || null,
      user_id: user.id,
      tenant_id: tenantId,
      start_date,
      end_date,
      start_time,
      end_time,
      guest_count,
      guest_details,
      base_price: basePrice,
      service_fee: serviceFee,
      tax_amount: taxAmount,
      discount_amount: 0,
      total_amount: totalAmount,
      currency,
      payment_status: "pending",
      status: "pending",
      confirmation_code: confirmationCode,
      special_requests,
      timezone: timezone || "UTC",
      form_responses: form_responses || {},
    };

    // Video meeting and round robin assignment will be handled by the API server
    // when calling the booking creation endpoint
    
    const { data: booking, error } = await adminClient
      .from("bookings")
      .insert(bookingData)
      .select()
      .single();

    if (error) {
      console.error("[POST /api/bookings] Database error:", error);
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    // Return snake_case format - hooks will transform to camelCase
    return NextResponse.json(booking, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/bookings] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

