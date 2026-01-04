import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentTenant } from "@/core/multi-tenancy/server";

/**
 * POST /api/integrations/video/zoom/callback
 * Handle Zoom OAuth callback
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

    const body = await req.json();
    const { code, state } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Authorization code is required" } },
        { status: 400 }
      );
    }

    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    const redirectUri = state
      ? JSON.parse(Buffer.from(state, "base64").toString()).redirect_uri
      : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3031"}/bookings/integrations/zoom/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: { code: "CONFIG_ERROR", message: "Zoom OAuth not configured" } },
        { status: 500 }
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "OAUTH_ERROR",
            message: error.error_description || tokenResponse.statusText,
          },
        },
        { status: 400 }
      );
    }

    const tokens = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch("https://api.zoom.us/v2/users/me", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const userInfo = userResponse.ok ? await userResponse.json() : {};

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : undefined;

    // Save integration
    const tenantId = await getCurrentTenant();
    const adminClient = createAdminClient();

    const { data: integration, error } = await adminClient
      .from("video_meeting_integrations")
      .upsert(
        {
          user_id: user.id,
          tenant_id: tenantId,
          provider: "zoom",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          account_id: userInfo.id,
          account_email: userInfo.email,
          account_name: userInfo.display_name || `${userInfo.first_name} ${userInfo.last_name}`,
          auto_create_meetings: true,
          default_meeting_settings: {},
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
      console.error("[POST /api/integrations/video/zoom/callback] Database error:", error);
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

    return NextResponse.json({ integration: transformedIntegration });
  } catch (error: any) {
    console.error("[POST /api/integrations/video/zoom/callback] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}


