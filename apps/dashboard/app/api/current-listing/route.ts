import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";

export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));
    const listingId = typeof body?.listingId === "string" && body.listingId ? body.listingId : null;

    if (listingId) {
      const [{ data: ownedListing }, { data: memberRow }] = await Promise.all([
        supabase
          .from("listings")
          .select("id")
          .eq("id", listingId)
          .eq("owner_id", user.id)
          .maybeSingle(),
        supabase
          .from("listing_members")
          .select("id")
          .eq("listing_id", listingId)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle(),
      ]);

      if (!ownedListing && !memberRow) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "You do not have access to this listing" } },
          { status: 403 }
        );
      }
    }

    const response = NextResponse.json({ success: true, currentListingId: listingId });
    if (listingId) {
      response.cookies.set("current_listing_id", listingId, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });
    } else {
      response.cookies.set("current_listing_id", "", {
        path: "/",
        maxAge: 0,
      });
    }
    return response;
  } catch (error) {
    console.error("[POST /api/current-listing] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update listing scope" } },
      { status: 500 }
    );
  }
}
