import { NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { canManageListing } from "@/lib/listing-access";
import { uploadSupportingVideo } from "@listing-platform/media";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

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
    const listingId = String(formData.get("listingId") || "").trim();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "file is required" } },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "file must be a video" } },
        { status: 400 }
      );
    }

    if (file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "video exceeds 100MB limit" },
        },
        { status: 400 }
      );
    }

    if (listingId) {
      const canManage = await canManageListing(user.id, listingId);
      if (!canManage) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Not allowed for this listing" } },
          { status: 403 }
        );
      }
    }

    const basePrefix = listingId ? `videos/${listingId}` : `videos/${user.id}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadSupportingVideo(buffer, {
      prefix: basePrefix,
      filename: file.name,
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          storage: "wasabi",
          key: uploaded.key,
          url: uploaded.url,
          size: uploaded.size,
          contentType: uploaded.contentType,
        },
      },
      {
        headers: {
          "CDN-Cache-Control": "max-age=31536000",
        },
      }
    );
  } catch (error) {
    console.error("[POST /api/upload/video] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to upload video" } },
      { status: 500 }
    );
  }
}
