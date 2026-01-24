import { NextRequest, NextResponse } from "next/server";
import { resetAIClientCache } from "@listing-platform/ai";

/**
 * POST /api/admin/ai-config/reset-cache
 * Reset the AI client cache to pick up new configuration
 */
export async function POST(req: NextRequest) {
  try {
    resetAIClientCache();
    return NextResponse.json({
      success: true,
      message: "AI client cache reset successfully",
    });
  } catch (error) {
    console.error("[api/admin/ai-config/reset-cache] error:", error);
    return NextResponse.json(
      { error: "Failed to reset cache" },
      { status: 500 }
    );
  }
}

