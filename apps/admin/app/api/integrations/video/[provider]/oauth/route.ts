import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/integrations/video/[provider]/oauth
 * Initiate OAuth flow for Zoom or Microsoft Teams
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const { provider } = params;
    const searchParams = req.nextUrl.searchParams;
    const redirectUri = searchParams.get("redirect_uri") || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3031"}/bookings/integrations/${provider}/callback`;

    if (provider === "zoom") {
      const clientId = process.env.ZOOM_CLIENT_ID;
      if (!clientId) {
        return NextResponse.json(
          { success: false, error: { code: "CONFIG_ERROR", message: "Zoom OAuth not configured" } },
          { status: 500 }
        );
      }

      const state = Buffer.from(JSON.stringify({ redirect_uri: redirectUri })).toString("base64");
      const zoomAuthUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

      return NextResponse.json({ authUrl: zoomAuthUrl });
    } else if (provider === "teams" || provider === "microsoft_teams") {
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const tenantId = process.env.MICROSOFT_TENANT_ID || "common";

      if (!clientId) {
        return NextResponse.json(
          { success: false, error: { code: "CONFIG_ERROR", message: "Microsoft OAuth not configured" } },
          { status: 500 }
        );
      }

      const state = Buffer.from(JSON.stringify({ redirect_uri: redirectUri })).toString("base64");
      const scopes = ["https://graph.microsoft.com/OnlineMeetings.ReadWrite", "offline_access"];
      const teamsAuthUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(scopes.join(" "))}&state=${state}`;

      return NextResponse.json({ authUrl: teamsAuthUrl });
    } else {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid provider. Must be 'zoom' or 'teams'" } },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("[GET /api/integrations/video/[provider]/oauth] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}


