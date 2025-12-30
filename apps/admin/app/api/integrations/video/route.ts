import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentTenant } from "@/core/multi-tenancy/server";
import { getUserPermissions } from "@/core/permissions/permissions";

/**
 * GET /api/integrations/video
 * List user's video integrations
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

    const tenantId = await getCurrentTenant();
    const adminClient = createAdminClient();

    const { data: integrations, error } = await adminClient
      .from("video_meeting_integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/integrations/video] Database error:", error);
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    // Transform snake_case to camelCase
    const transformedIntegrations = (integrations || []).map((integration: any) => ({
      id: integration.id,
      userId: integration.user_id,
      tenantId: integration.tenant_id,
      provider: integration.provider,
      accountEmail: integration.account_email,
      accountName: integration.account_name,
      autoCreateMeetings: integration.auto_create_meetings,
      defaultMeetingSettings: integration.default_meeting_settings || {},
      active: integration.active,
      createdAt: integration.created_at,
      updatedAt: integration.updated_at,
    }));

    return NextResponse.json({
      integrations: transformedIntegrations,
    });
  } catch (error: any) {
    console.error("[GET /api/integrations/video] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/video
 * Create or update video integration
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

    const tenantId = await getCurrentTenant();
    const adminClient = createAdminClient();
    const body = await req.json();

    const {
      provider,
      accessToken,
      refreshToken,
      tokenExpiresAt,
      accountId,
      accountEmail,
      accountName,
      autoCreateMeetings = true,
      defaultMeetingSettings = {},
    } = body;

    if (!provider || !accessToken) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "provider and accessToken are required" } },
        { status: 400 }
      );
    }

    if (!["zoom", "microsoft_teams"].includes(provider)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "provider must be 'zoom' or 'microsoft_teams'" } },
        { status: 400 }
      );
    }

    // Upsert integration
    const { data: integration, error } = await adminClient
      .from("video_meeting_integrations")
      .upsert(
        {
          user_id: user.id,
          tenant_id: tenantId,
          provider,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: tokenExpiresAt,
          account_id: accountId,
          account_email: accountEmail,
          account_name: accountName,
          auto_create_meetings: autoCreateMeetings,
          default_meeting_settings: defaultMeetingSettings,
          active: true,
        },
        {
          onConflict: "user_id,provider",
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error("[POST /api/integrations/video] Database error:", error);
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    // Transform to camelCase
    const transformedIntegration = {
      id: integration.id,
      userId: integration.user_id,
      tenantId: integration.tenant_id,
      provider: integration.provider,
      accountEmail: integration.account_email,
      accountName: integration.account_name,
      autoCreateMeetings: integration.auto_create_meetings,
      defaultMeetingSettings: integration.default_meeting_settings || {},
      active: integration.active,
      createdAt: integration.created_at,
      updatedAt: integration.updated_at,
    };

    return NextResponse.json({ integration: transformedIntegration }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/integrations/video] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}


