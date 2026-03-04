import { NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { healthCheckWasabi } from "@listing-platform/media";

export async function GET() {
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

    const adminClient = createAdminClient();
    const bucket = process.env.SUPABASE_MAIN_IMAGES_BUCKET || "main-images";
    const { error: supabaseStorageError } = await adminClient.storage
      .from(bucket)
      .list("featured", { limit: 1 });

    const wasabi = await healthCheckWasabi();

    const supabaseStorageOk = !supabaseStorageError;
    const overallOk = supabaseStorageOk && wasabi.ok;

    return NextResponse.json(
      {
        success: true,
        data: {
          overall: overallOk ? "ok" : "degraded",
          supabaseStorage: {
            ok: supabaseStorageOk,
            bucket,
            message: supabaseStorageError?.message || null,
          },
          wasabi: {
            ok: wasabi.ok,
            message: wasabi.message || null,
          },
        },
      },
      { status: overallOk ? 200 : 503 }
    );
  } catch (error) {
    console.error("[GET /api/health/storage] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Storage health check failed" } },
      { status: 500 }
    );
  }
}
