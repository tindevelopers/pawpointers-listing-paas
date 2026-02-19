import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { withRateLimit } from "@/middleware/api-rate-limit";

export const dynamic = "force-dynamic";

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

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    let query = supabase
      .from("bookings")
      .select("*, listings(id, title, slug, images)", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: bookings, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      data: {
        bookings: bookings || [],
        total: count || 0,
        page,
        limit,
      },
    });
  } catch (error: unknown) {
    console.error("[GET /api/booking/list] Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch bookings";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export const GET = withRateLimit(handler, "/api/booking/list");
