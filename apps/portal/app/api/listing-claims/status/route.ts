import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    const listingId = request.nextUrl.searchParams.get("listingId");
    if (!listingId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "listingId is required" } },
        { status: 400 }
      );
    }

    const [{ data: ownerRow }, { data: memberRow }, { data: claimRow }] = await Promise.all([
      supabase
        .from("listings")
        .select("id")
        .eq("id", listingId)
        .eq("owner_id", user.id)
        .maybeSingle(),
      supabase
        .from("listing_members")
        .select("id, role")
        .eq("listing_id", listingId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("listing_claims")
        .select("id, status, created_at")
        .eq("listing_id", listingId)
        .eq("claimant_user_id", user.id)
        .in("status", ["draft", "submitted", "provisional", "approved"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const isOwner = !!ownerRow;
    const isMember = !!memberRow;
    const canClaim = !isOwner && !isMember && !claimRow;

    return NextResponse.json({
      success: true,
      data: {
        canClaim,
        isOwner,
        isMember,
        activeClaim: claimRow || null,
      },
    });
  } catch (error) {
    console.error("[GET /api/listing-claims/status] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load claim status" } },
      { status: 500 }
    );
  }
}
