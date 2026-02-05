import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { mintImpersonationToken } from "@tinadmin/core";
import { isStaffAuthEnabled, createStaffClient, requireSystemAdmin } from "@/app/actions/staff-auth";

/**
 * POST /api/impersonation
 * Mint a scoped impersonation token for support workflows.
 *
 * Note: In the final architecture this should be gated by Staff Supabase RBAC.
 * For now, we gate by existing Platform Admin (customer DB) check.
 */
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.IMPERSONATION_JWT_SECRET;
    if (!secret) {
      return NextResponse.json(
        { success: false, error: { code: "CONFIG_ERROR", message: "IMPERSONATION_JWT_SECRET is not set" } },
        { status: 500 }
      );
    }

    // Prefer Staff Supabase System Admin when configured
    let actorId: string;
    if (isStaffAuthEnabled()) {
      const staff = await createStaffClient();
      const { data: { user }, error: authError } = await staff.auth.getUser();
      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
          { status: 401 }
        );
      }
      await requireSystemAdmin();
      actorId = user.id;
    } else {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
          { status: 401 }
        );
      }

      // Verify Platform Admin (tenant_id NULL + role Platform Admin)
      const adminClient = createAdminClient();
      const { data: userRow, error: userRowError } = await (adminClient.from("users") as any)
        .select("id, tenant_id, roles:role_id(name)")
        .eq("id", user.id)
        .single();

      if (userRowError || !userRow) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Unable to verify admin role" } },
          { status: 403 }
        );
      }

      const roleName = (userRow.roles as any)?.name;
      const isPlatformAdmin = roleName === "Platform Admin" && userRow.tenant_id === null;
      if (!isPlatformAdmin) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Platform Admin required" } },
          { status: 403 }
        );
      }
      actorId = user.id;
    }

    const body = await req.json();
    const {
      target_user_id,
      target_tenant_id,
      scope = "support_write_limited",
      reason,
      ticket_id,
      ttl_seconds,
      app = "dashboard", // dashboard | portal
    } = body ?? {};

    if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "reason is required (min 5 chars)" } },
        { status: 400 }
      );
    }

    const token = mintImpersonationToken(
      {
        actor_staff_user_id: actorId,
        target_user_id,
        target_tenant_id,
        scope,
        reason,
        ticket_id,
        ttlSeconds: typeof ttl_seconds === "number" ? ttl_seconds : undefined,
      },
      secret
    );

    const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://dashboard.yourcompany.com";
    const portalUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yourcompany.com";
    const targetBase = app === "portal" ? portalUrl : dashboardUrl;

    return NextResponse.json({
      success: true,
      data: {
        token,
        url: `${targetBase}/impersonate?token=${encodeURIComponent(token)}`,
      },
    });
  } catch (error: any) {
    console.error("[impersonation] Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

