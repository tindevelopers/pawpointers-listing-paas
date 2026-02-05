import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { getUserPermissions } from "@/core/permissions/permissions";

/**
 * GET /api/reviews/moderation
 * List reviews with moderation queue data
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

    // Check permissions - only platform admins can access moderation
    const permissions = await getUserPermissions(user.id);
    if (!permissions.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Platform admin access required" } },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status"); // moderation_status filter
    const aiStatus = searchParams.get("aiStatus"); // ai_moderation_status filter
    const priority = searchParams.get("priority");
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build query - join reviews with moderation queue
    let query = supabase
      .from("review_moderation_queue")
      .select(`
        *,
        reviews:review_id (
          id,
          listing_id,
          user_id,
          rating,
          title,
          content,
          images,
          status,
          created_at,
          updated_at,
          reviewer_type,
          listings:listing_id (
            id,
            title,
            slug
          ),
          users:user_id (
            id,
            email,
            full_name,
            avatar_url
          )
        )
      `)
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq("moderation_status", status);
    }
    if (aiStatus) {
      query = query.eq("ai_moderation_status", aiStatus);
    }
    if (priority) {
      query = query.eq("priority", priority);
    }

    const { data: moderationQueue, error } = await query;

    if (error) {
      console.error("Error fetching moderation queue:", error);
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("review_moderation_queue")
      .select("*", { count: "exact", head: true });

    if (status) {
      countQuery = countQuery.eq("moderation_status", status);
    }
    if (aiStatus) {
      countQuery = countQuery.eq("ai_moderation_status", aiStatus);
    }
    if (priority) {
      countQuery = countQuery.eq("priority", priority);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      success: true,
      data: moderationQueue || [],
      meta: {
        total: count || 0,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error("[moderation API] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/reviews/moderation
 * Update moderation status
 */
export async function PATCH(req: NextRequest) {
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
    if (!permissions.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Platform admin access required" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { queue_id, moderation_status, moderation_notes, priority } = body;

    if (!queue_id || !moderation_status) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "queue_id and moderation_status are required" } },
        { status: 400 }
      );
    }

    // Update moderation queue
    const updateData: any = {
      moderation_status,
      moderator_id: user.id,
      moderated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (moderation_notes !== undefined) {
      updateData.moderation_notes = moderation_notes;
    }
    if (priority !== undefined) {
      updateData.priority = priority;
    }

    const { data, error } = await supabase
      .from("review_moderation_queue")
      .update(updateData)
      .eq("id", queue_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating moderation queue:", error);
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("[moderation API] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews/moderation/bulk
 * Bulk moderation actions
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
    if (!permissions.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Platform admin access required" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { queue_ids, action, moderation_notes } = body;

    if (!Array.isArray(queue_ids) || queue_ids.length === 0 || !action) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "queue_ids array and action are required" } },
        { status: 400 }
      );
    }

    const validActions = ["approve", "reject", "escalate"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: `action must be one of: ${validActions.join(", ")}` } },
        { status: 400 }
      );
    }

    // Map action to moderation_status
    const statusMap: Record<string, string> = {
      approve: "approved",
      reject: "rejected",
      escalate: "escalated",
    };

    const moderation_status = statusMap[action];

    // Update all selected queue entries
    const updateData: any = {
      moderation_status,
      moderator_id: user.id,
      moderated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (moderation_notes) {
      updateData.moderation_notes = moderation_notes;
    }

    if (action === "escalate") {
      updateData.priority = "urgent";
    }

    const { data, error } = await supabase
      .from("review_moderation_queue")
      .update(updateData)
      .in("id", queue_ids)
      .select();

    if (error) {
      console.error("Error bulk updating moderation queue:", error);
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        updated: data?.length || 0,
        items: data,
      },
    });
  } catch (error: any) {
    console.error("[moderation API] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
