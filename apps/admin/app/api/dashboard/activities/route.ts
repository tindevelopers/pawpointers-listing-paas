import { NextResponse } from "next/server";
import { getRecentActivities } from "@/app/actions/dashboard";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenantId");
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 8;

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId query parameter is required" },
        { status: 400 }
      );
    }

    const activities = await getRecentActivities({ tenantId, limit });
    return NextResponse.json({ data: activities });
  } catch (error) {
    console.error("[dashboard/activities] Failed to load activities", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load recent activities",
      },
      { status: 500 }
    );
  }
}
