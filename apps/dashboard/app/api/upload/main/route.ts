import { NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { canManageListing } from "@/lib/listing-access";
import { uploadMainImageAsset } from "@listing-platform/media";

const ALLOWED_TYPES = new Set(["logo", "avatar", "featured"]);

export async function POST(request: Request) {
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

    const formData = await request.formData();
    const type = String(formData.get("type") || "").trim();
    const entityId = String(formData.get("entityId") || "").trim();
    const file = formData.get("file");

    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "type must be one of: logo, avatar, featured",
          },
        },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "file is required" } },
        { status: 400 }
      );
    }

    if (!entityId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "entityId is required" } },
        { status: 400 }
      );
    }

    if (type === "featured") {
      const canManage = await canManageListing(user.id, entityId);
      if (!canManage) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Not allowed for this listing" } },
          { status: 403 }
        );
      }
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadMainImageAsset(buffer, {
      type: type as "logo" | "avatar" | "featured",
      entityId,
      tenantId: (userRow as any)?.tenant_id ?? null,
      filename: file.name,
      contentType: file.type || "image/webp",
      maxWidth: 1200,
      maxHeight: 1200,
      format: "webp",
      generateThumbnails: false,
      generateWebP: false,
    });

    return NextResponse.json({
      success: true,
      data: {
        storage: "supabase",
        key: uploaded.key,
        url: uploaded.url,
        size: uploaded.size,
        dimensions: uploaded.dimensions,
      },
    });
  } catch (error) {
    console.error("[POST /api/upload/main] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to upload main image" } },
      { status: 500 }
    );
  }
}
