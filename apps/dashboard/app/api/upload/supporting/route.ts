import { NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { canManageListing } from "@/lib/listing-access";
import { uploadSupportingImage } from "@listing-platform/media";

const ALLOWED_PREFIXES = new Set(["gallery", "reviews"]);

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
    const prefix = String(formData.get("prefix") || "gallery").trim();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "file is required" } },
        { status: 400 }
      );
    }

    if (!ALLOWED_PREFIXES.has(prefix)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "prefix must be one of: gallery, reviews" },
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

    const basePrefix = listingId ? `${prefix}/${listingId}` : `${prefix}/${user.id}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadSupportingImage(buffer, {
      prefix: basePrefix,
      filename: file.name,
      quality: 84,
      maxWidth: 2400,
      maxHeight: 2400,
      format: "jpeg",
      generateWebP: true,
      generateThumbnails: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          storage: "wasabi",
          key: uploaded.key,
          url: uploaded.url,
          webpUrl: uploaded.webpUrl,
          thumbnails: uploaded.thumbnails,
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
    console.error("[POST /api/upload/supporting] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to upload supporting image" } },
      { status: 500 }
    );
  }
}
