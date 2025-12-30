import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentTenant } from "@/core/multi-tenancy/server";

/**
 * DELETE /api/integrations/video/[id]
 * Delete (deactivate) video integration
 */
export async function DELETE(
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

    const adminClient = createAdminClient();

    // Verify the integration belongs to the user
    const { data: existing, error: fetchError } = await adminClient
      .from("video_meeting_integrations")
      .select("user_id")
      .eq("id", params.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Integration not found" } },
        { status: 404 }
      );
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You can only delete your own integrations" } },
        { status: 403 }
      );
    }

    // Deactivate instead of deleting
    const { error } = await adminClient
      .from("video_meeting_integrations")
      .update({ active: false })
      .eq("id", params.id);

    if (error) {
      console.error("[DELETE /api/integrations/video/[id]] Database error:", error);
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error: any) {
    console.error("[DELETE /api/integrations/video/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}


