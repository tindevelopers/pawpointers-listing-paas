"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { uploadMainImageAsset, uploadSupportingImage } from "@listing-platform/media";
import {
  canManageListing,
  getScopedListingIds,
} from "@/lib/listing-access";
import { ListingCustomFieldsSchema } from "@/lib/listing-profile-schema";

export async function listListings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const listingIds = await getScopedListingIds(user.id);
  if (listingIds.length === 0) return [];

  const { data, error } = await supabase
    .from("listings")
    .select("id, title, slug, status, price, currency, featured_image, updated_at")
    .in("id", listingIds)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("listListings error", error);
    return [];
  }

  return data || [];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function normalizeText(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeNumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return undefined;
  return parsed;
}

function normalizeCsv(value: FormDataEntryValue | null): string[] | undefined {
  if (typeof value !== "string") return undefined;
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isNaN(value) ? undefined : value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function isValidUrl(value: string | undefined): boolean {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export async function upsertListing(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const id = formData.get("id")?.toString();
  const title = formData.get("title")?.toString() || "";
  const slugInput = formData.get("slug")?.toString();
  const description = formData.get("description")?.toString() || null;
  const status = formData.get("status")?.toString() || "draft";
  const priceValue = formData.get("price")?.toString();
  const price = priceValue ? Number(priceValue) : null;
  const currency = formData.get("currency")?.toString() || "USD";
  const featuredImage = formData.get("featured_image")?.toString() || null;
  const addressJson = formData.get("address")?.toString();

  if (!title) throw new Error("Title is required");

  const { data: userRow } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  let address: Record<string, unknown> | null | undefined = undefined;
  if (addressJson) {
    try {
      const parsed = JSON.parse(addressJson) as Record<string, unknown>;
      if (parsed && (parsed.lat != null || parsed.street)) {
        address = {
          street: parsed.street ?? null,
          city: parsed.city ?? null,
          region: parsed.region ?? parsed.state ?? null,
          country: parsed.country ?? null,
          lat: parsed.lat ?? null,
          lng: parsed.lng ?? null,
        };
      }
    } catch {
      /* ignore invalid JSON */
    }
  }

  const payload = {
    title,
    slug: slugInput ? slugify(slugInput) : slugify(title),
    description,
    status,
    price,
    currency,
    featured_image: featuredImage,
    ...(address !== undefined && { address }),
  };

  if (id) {
    const canManage = await canManageListing(user.id, id);
    if (!canManage) {
      throw new Error("Not authorized to update this listing");
    }

    const { error } = await (supabase.from("listings") as any).update(payload).eq("id", id);
    if (error) {
      console.error("update listing error", error);
      throw error;
    }
  } else {
    const { error } = await (supabase.from("listings") as any).insert({
      ...payload,
      owner_id: user.id,
      tenant_id: (userRow as any)?.tenant_id || null,
    });
    if (error) {
      console.error("create listing error", error);
      throw error;
    }
  }

  revalidatePath("/listings");
}

export async function publishListing(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const canManage = await canManageListing(user.id, id);
  if (!canManage) {
    throw new Error("Not authorized to publish this listing");
  }

  const { error } = await (supabase.from("listings") as any)
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("publishListing error", error);
    throw error;
  }

  revalidatePath("/listings");
}

export async function unpublishListing(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const canManage = await canManageListing(user.id, id);
  if (!canManage) {
    throw new Error("Not authorized to unpublish this listing");
  }

  const { error } = await (supabase.from("listings") as any)
    .update({ status: "draft" })
    .eq("id", id);

  if (error) {
    console.error("unpublishListing error", error);
    throw error;
  }

  revalidatePath("/listings");
}

export type DeleteListingResult = { success: true } | { success: false; error: string };

export async function deleteListing(formData: FormData): Promise<DeleteListingResult> {
  const id = formData.get("id")?.toString();
  if (!id) return { success: false, error: "Missing listing id" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const canManage = await canManageListing(user.id, id);
  if (!canManage) {
    return { success: false, error: "Not authorized to delete this listing" };
  }

  const { data: deleted, error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("delete listing error", error);
    return { success: false, error: error.message || "Failed to delete listing" };
  }
  if (!deleted) {
    return { success: false, error: "Listing could not be deleted. You may not have permission." };
  }

  revalidatePath("/listings");
  return { success: true };
}

export async function addListingImage(formData: FormData) {
  const listingId = formData.get("listing_id")?.toString();
  const imageUrl = formData.get("image_url")?.toString();
  if (!listingId || !imageUrl) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const canManage = await canManageListing(user.id, listingId);
  if (!canManage) {
    throw new Error("Not authorized to manage media for this listing");
  }

  const { error } = await (supabase.from("listing_images") as any).insert({
    listing_id: listingId,
    storage_key: imageUrl,
    cdn_url: imageUrl,
    storage_backend: "wasabi",
  });

  if (error) {
    console.error("add listing image error", error);
  }

  revalidatePath("/listings");
}

export async function sendMessage(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const conversationId = String(formData.get("conversationId") || "");
  const content = String(formData.get("content") || "").trim();

  if (!conversationId || !content) {
    throw new Error("Message content is required");
  }

  const { error } = await supabase
    .from("messages")
    // @ts-expect-error Supabase type inference
    .insert({
      conversation_id: conversationId,
      sender_id: user!.id,
      content,
      status: "sent",
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/inbox");
}

export async function addImage(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const listingId = String(formData.get("listingId") || "");
  const imageUrlInput = String(formData.get("imageUrl") || "").trim();
  const imageFile = formData.get("imageFile");
  const altText = String(formData.get("altText") || "").trim();

  if (!listingId) {
    throw new Error("Listing is required");
  }

  const canManage = await canManageListing(user.id, listingId);
  if (!canManage) {
    throw new Error("Not authorized to manage media for this listing");
  }

  let imageUrl = imageUrlInput;
  let storageKey = imageUrlInput;
  let storageBackend: "wasabi" | "supabase" = "wasabi";

  if (imageFile instanceof File && imageFile.size > 0) {
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const uploaded = await uploadSupportingImage(buffer, {
      prefix: `gallery/${listingId}`,
      filename: imageFile.name,
      maxWidth: 2400,
      maxHeight: 2400,
      quality: 84,
      format: "jpeg",
      generateWebP: true,
      generateThumbnails: true,
    });
    imageUrl = uploaded.url;
    storageKey = uploaded.key;
    storageBackend = "wasabi";
  }

  if (!imageUrl) {
    throw new Error("Upload a file or provide an image URL");
  }

  const { error } = await supabase
    .from("listing_images")
    // @ts-expect-error Supabase type inference
    .insert({
      listing_id: listingId,
      storage_key: storageKey,
      cdn_url: imageUrl,
      alt_text: altText || null,
      storage_backend: storageBackend,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/media");
}

export async function setFeaturedImage(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const listingId = String(formData.get("listingId") || "");
  const featuredImageUrl = String(formData.get("featuredImageUrl") || "").trim();
  const featuredImageFile = formData.get("featuredImageFile");

  if (!listingId) {
    throw new Error("Listing is required");
  }

  const canManage = await canManageListing(user.id, listingId);
  if (!canManage) {
    throw new Error("Not authorized to manage media for this listing");
  }

  let finalFeaturedImageUrl = featuredImageUrl;

  if (featuredImageFile instanceof File && featuredImageFile.size > 0) {
    const { data: listing } = await supabase
      .from("listings")
      .select("tenant_id")
      .eq("id", listingId)
      .single();

    const buffer = Buffer.from(await featuredImageFile.arrayBuffer());
    const uploaded = await uploadMainImageAsset(buffer, {
      type: "featured",
      entityId: listingId,
      tenantId: (listing as any)?.tenant_id ?? null,
      filename: featuredImageFile.name,
      contentType: featuredImageFile.type || "image/webp",
      maxWidth: 1400,
      maxHeight: 1400,
      quality: 85,
      format: "webp",
      generateThumbnails: false,
      generateWebP: false,
    });
    finalFeaturedImageUrl = uploaded.url;
  }

  if (!finalFeaturedImageUrl) {
    throw new Error("Upload a file or provide a URL for the featured image");
  }

  const { error } = await supabase
    .from("listings")
    // @ts-expect-error Supabase type inference
    .update({ featured_image: finalFeaturedImageUrl })
    .eq("id", listingId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/media");
  revalidatePath("/listings");
}

export async function deleteImage(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const imageId = String(formData.get("imageId") || "");
  if (!imageId) return;
  const { data: row } = await supabase
    .from("listing_images")
    .select("listing_id")
    .eq("id", imageId)
    .maybeSingle();
  const listingImage = row as { listing_id?: string } | null;

  if (!listingImage?.listing_id || !(await canManageListing(user.id, listingImage.listing_id))) {
    throw new Error("Not authorized to delete this image");
  }

  await supabase.from("listing_images").delete().eq("id", imageId);
  revalidatePath("/media");
}

export async function respondToReview(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const reviewId = String(formData.get("reviewId") || "");
  const response = String(formData.get("response") || "").trim();

  if (!reviewId || !response) {
    throw new Error("Response cannot be empty");
  }

  const { error } = await (supabase.rpc as any)("respond_to_review", {
    p_review_id: reviewId,
    p_response: response,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/reviews");
}

export async function respondToExternalReview(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const externalReviewId = String(formData.get("externalReviewId") || "");
  const response = String(formData.get("response") || "").trim();

  if (!externalReviewId || !response) {
    throw new Error("Response cannot be empty");
  }

  const { error } = await (supabase.rpc as any)("respond_to_external_review", {
    p_external_review_id: externalReviewId,
    p_response: response,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/reviews");
}

export async function upsertDataForSeoSource(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const entityId = String(formData.get("entityId") || "");
  const target = String(formData.get("target") || "").trim();
  const targetType = String(formData.get("targetType") || "generic").trim();
  const provider = String(formData.get("provider") || "dataforseo").trim();

  if (!entityId || !target) {
    throw new Error("entityId and target are required");
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, tenant_id, owner_id")
    .eq("id", entityId)
    .single();

  const canManage = listing ? await canManageListing(user.id, entityId) : false;
  if (!listing || !canManage) {
    throw new Error("Not authorized to manage this listing");
  }

  const { error } = await (supabase.from("external_review_sources") as any).upsert({
    entity_id: entityId,
    tenant_id: (listing as any).tenant_id || null,
    provider,
    target_type: targetType,
    target,
    enabled: true,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/reviews");
}

function slugifyInput(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string | null,
  base: string,
  excludeId?: string
) {
  let candidate = base;
  let attempt = 1;
  while (true) {
    let query = supabase
      .from("listings")
      .select("id")
      .eq("slug", candidate);
    if (excludeId) {
      query = query.neq("id", excludeId);
    }
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
}

export async function createListing(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const featuredImageUrlInput = String(formData.get("featuredImageUrl") || "").trim();
  const featuredImageFile = formData.get("featuredImageFile");
  const addressJson = formData.get("address")?.toString();

  if (!title) {
    throw new Error("Title is required");
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user!.id)
    .single();

  const tenantId = (userRow as any)?.tenant_id ?? null;
  const baseSlug = slugifyInput(title);
  const slug = await ensureUniqueSlug(supabase, tenantId, baseSlug || crypto.randomUUID());

  let address: Record<string, unknown> | null = null;
  if (addressJson) {
    try {
      const parsed = JSON.parse(addressJson) as Record<string, unknown>;
      if (parsed && (parsed.lat != null || parsed.street)) {
        address = {
          street: parsed.street ?? null,
          city: parsed.city ?? null,
          region: parsed.region ?? parsed.state ?? null,
          country: parsed.country ?? null,
          lat: parsed.lat ?? null,
          lng: parsed.lng ?? null,
        };
      }
    } catch {
      /* ignore invalid JSON */
    }
  }

  const insertPayload = {
    title,
    slug,
    description,
    status: "draft",
    owner_id: user!.id,
    tenant_id: tenantId,
    ...(address && { address }),
  };

  let createdListing: { id: string; tenant_id: string | null } | null = null;
  const { data: createdListingData, error } = await (supabase
    .from("listings") as any)
    .insert(insertPayload)
    .select("id, tenant_id")
    .single();

  if (error) {
    const message = error.message || "";
    if (message.toLowerCase().includes("row-level security")) {
      try {
        const admin = createAdminClient();
        const { data: adminCreated, error: adminError } = await (admin
          .from("listings") as any)
          .insert(insertPayload)
          .select("id, tenant_id")
          .single();
        if (adminError) {
          throw adminError;
        }
        createdListing = adminCreated as { id: string; tenant_id: string | null };
      } catch (adminError: any) {
        throw new Error(
          adminError?.message ||
            "Listing creation failed due to RLS. Ensure SUPABASE_SERVICE_ROLE_KEY is set."
        );
      }
    } else {
      throw new Error(error.message);
    }
  } else {
    createdListing = createdListingData as { id: string; tenant_id: string | null };
  }

  if (!createdListing) {
    throw new Error("Listing creation failed");
  }

  let featuredImage = featuredImageUrlInput;
  if (featuredImageFile instanceof File && featuredImageFile.size > 0) {
    const buffer = Buffer.from(await featuredImageFile.arrayBuffer());
    const uploaded = await uploadMainImageAsset(buffer, {
      type: "featured",
      entityId: createdListing.id,
      tenantId: createdListing.tenant_id ?? tenantId,
      filename: featuredImageFile.name,
      contentType: featuredImageFile.type || "image/webp",
      maxWidth: 1400,
      maxHeight: 1400,
      quality: 85,
      format: "webp",
      generateThumbnails: false,
      generateWebP: false,
    });
    featuredImage = uploaded.url;
  }

  if (featuredImage) {
    const { error: featuredError } = await supabase
      .from("listings")
      // @ts-expect-error Supabase type inference
      .update({ featured_image: featuredImage })
      .eq("id", createdListing.id);
    if (featuredError) {
      throw new Error(featuredError.message);
    }
  }

  revalidatePath("/listings");
  redirect(`/listings/${(createdListing as any).id}`);
}

export type UpdateListingState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
};

export async function updateListingDetails(
  _prevState: UpdateListingState,
  formData: FormData
): Promise<UpdateListingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Not authenticated." };
  }

  const listingId = normalizeText(formData.get("id"));
  if (!listingId) {
    return { ok: false, message: "Listing is required." };
  }

  const canManage = await canManageListing(user.id, listingId);
  if (!canManage) {
    return { ok: false, message: "Not authorized to update this listing." };
  }

  const { data: listingRow, error: listingError } = await supabase
    .from("listings")
    .select("id, tenant_id")
    .eq("id", listingId)
    .single();

  if (listingError || !listingRow) {
    return { ok: false, message: "Listing not found." };
  }

  const title = normalizeText(formData.get("title"));
  const description = normalizeText(formData.get("description")) || "";
  const tagline = normalizeText(formData.get("tagline"));
  const excerpt = normalizeText(formData.get("excerpt")) || tagline;
  const category = normalizeText(formData.get("category"));
  const featuredImage = normalizeText(formData.get("featuredImageUrl"));

  if (!title) {
    return { ok: false, message: "Title is required." };
  }

  const slugInput = normalizeText(formData.get("slug"));
  const baseSlug = slugifyInput(slugInput || title || "");
  const slug = await ensureUniqueSlug(
    supabase,
    (listingRow as any)?.tenant_id ?? null,
    baseSlug || crypto.randomUUID(),
    listingId
  );

  const price = normalizeNumber(formData.get("price"));
  const currency = normalizeText(formData.get("currency")) || "USD";
  const priceType = normalizeText(formData.get("priceType"));
  const videoUrl = normalizeText(formData.get("videoUrl"));

  if (!isValidUrl(featuredImage)) {
    return { ok: false, message: "Featured image must be a valid URL." };
  }
  if (!isValidUrl(videoUrl)) {
    return { ok: false, message: "Video URL must be a valid URL." };
  }

  const addressJson = formData.get("address")?.toString();
  let address: Record<string, unknown> | null | undefined = undefined;
  if (addressJson) {
    try {
      const parsed = JSON.parse(addressJson) as Record<string, unknown>;
      if (parsed && (parsed.lat != null || parsed.street)) {
        address = {
          street: parsed.street ?? null,
          city: parsed.city ?? null,
          region: parsed.region ?? parsed.state ?? null,
          country: parsed.country ?? null,
          lat: parsed.lat ?? null,
          lng: parsed.lng ?? null,
        };
      }
    } catch {
      /* ignore invalid JSON */
    }
  }

  const tags = normalizeCsv(formData.get("tags"));

  const contactPhone = normalizeText(formData.get("contactPhone"));
  const contactEmail = normalizeText(formData.get("contactEmail"));
  const contactWebsite = normalizeText(formData.get("contactWebsite"));
  const contactBookingUrl = normalizeText(formData.get("contactBookingUrl"));
  const contactWhatsappUrl = normalizeText(formData.get("contactWhatsappUrl"));

  if (!isValidUrl(contactBookingUrl)) {
    throw new Error("Booking URL must be a valid URL");
  }
  if (!isValidUrl(contactWhatsappUrl)) {
    throw new Error("WhatsApp URL must be a valid URL");
  }

  const businessName = normalizeText(formData.get("businessName"));
  const ownerName = normalizeText(formData.get("ownerName"));
  const yearsExperience = normalizeNumber(formData.get("yearsExperience"));
  const certifications = normalizeCsv(formData.get("certifications"));
  const insured = formData.get("insured") === "on";
  const licenseNumber = normalizeText(formData.get("licenseNumber"));
  const logoUrl = normalizeText(formData.get("logoUrl"));

  if (!isValidUrl(logoUrl)) {
    throw new Error("Logo URL must be a valid URL");
  }

  const serviceMode = normalizeText(formData.get("serviceMode"));
  const serviceRadius = normalizeNumber(formData.get("serviceRadius"));
  const radiusUnit = normalizeText(formData.get("radiusUnit"));

  const servicesJson = normalizeText(formData.get("servicesJson")) || "[]";
  let servicesInput: unknown = [];
  try {
    servicesInput = JSON.parse(servicesJson);
  } catch {
    servicesInput = [];
  }

  const services = Array.isArray(servicesInput)
    ? servicesInput
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const record = item as Record<string, unknown>;
          const name = typeof record.name === "string" ? record.name.trim() : "";
          if (!name) return null;
          return {
            name,
            price: coerceNumber(record.price),
            currency: typeof record.currency === "string" ? record.currency : undefined,
            priceType: typeof record.priceType === "string" ? record.priceType : undefined,
            durationMinutes: coerceNumber(record.durationMinutes),
            description:
              typeof record.description === "string" ? record.description : undefined,
            featured: record.featured === true,
          };
        })
        .filter((service) => service && service.name)
    : [];

  const packagesJson = normalizeText(formData.get("packagesJson")) || "[]";
  let packagesInput: unknown = [];
  try {
    packagesInput = JSON.parse(packagesJson);
  } catch {
    packagesInput = [];
  }

  const packages = Array.isArray(packagesInput)
    ? packagesInput
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const record = item as Record<string, unknown>;
          const name = typeof record.name === "string" ? record.name.trim() : "";
          if (!name) return null;
          const included = Array.isArray(record.includedServiceNames)
            ? record.includedServiceNames.filter((value) => typeof value === "string")
            : undefined;
          return {
            name,
            price: coerceNumber(record.price),
            currency: typeof record.currency === "string" ? record.currency : undefined,
            description:
              typeof record.description === "string" ? record.description : undefined,
            includedServiceNames: included,
          };
        })
        .filter((pkg) => pkg && pkg.name)
    : [];

  const buildHoursDay = (prefix: string) => {
    const open = formData.get(`${prefix}_open`) === "on";
    const openTime = normalizeText(formData.get(`${prefix}_openTime`));
    const closeTime = normalizeText(formData.get(`${prefix}_closeTime`));
    return {
      open,
      ...(openTime ? { openTime } : {}),
      ...(closeTime ? { closeTime } : {}),
    };
  };

  const hours = {
    mon: buildHoursDay("hours_mon"),
    tue: buildHoursDay("hours_tue"),
    wed: buildHoursDay("hours_wed"),
    thu: buildHoursDay("hours_thu"),
    fri: buildHoursDay("hours_fri"),
    sat: buildHoursDay("hours_sat"),
    sun: buildHoursDay("hours_sun"),
  };

  const anyHoursOpen = Object.values(hours).some((day) => day.open);

  const features = {
    parking: formData.get("featureParking") === "on",
    petFriendly: formData.get("featurePetFriendly") === "on",
    mobileService: formData.get("featureMobileService") === "on",
    organicProducts: formData.get("featureOrganicProducts") === "on",
    certifiedGroomers: formData.get("featureCertifiedGroomers") === "on",
    pickupDropoff: formData.get("featurePickupDropoff") === "on",
    spaServices: formData.get("featureSpaServices") === "on",
    ecoFriendly: formData.get("featureEcoFriendly") === "on",
    custom: normalizeCsv(formData.get("featureCustom")),
  };

  const social = {
    instagram: normalizeText(formData.get("socialInstagram")),
    facebook: normalizeText(formData.get("socialFacebook")),
    tiktok: normalizeText(formData.get("socialTiktok")),
    linkedin: normalizeText(formData.get("socialLinkedin")),
    youtube: normalizeText(formData.get("socialYoutube")),
    x: normalizeText(formData.get("socialX")),
  };

  const customFieldsInput = {
    schemaVersion: 1,
    category,
    tags,
    tagline,
    contact: contactPhone || contactEmail || contactWebsite || contactBookingUrl || contactWhatsappUrl
      ? {
          phone: contactPhone,
          email: contactEmail,
          website: contactWebsite,
          bookingUrl: contactBookingUrl,
          whatsappUrl: contactWhatsappUrl,
        }
      : undefined,
    providerProfile: businessName || ownerName || yearsExperience || certifications || insured || licenseNumber || logoUrl
      ? {
          businessName,
          ownerName,
          yearsExperience,
          certifications,
          insured: insured || undefined,
          licenseNumber,
          logoUrl,
        }
      : undefined,
    serviceArea: serviceMode || serviceRadius || radiusUnit
      ? {
          serviceMode,
          radius: serviceRadius,
          radiusUnit,
        }
      : undefined,
    services: services.length > 0 ? services : undefined,
    packages: packages.length > 0 ? packages : undefined,
    hours: anyHoursOpen ? hours : undefined,
    features:
      features.parking ||
      features.petFriendly ||
      features.mobileService ||
      features.organicProducts ||
      features.certifiedGroomers ||
      features.pickupDropoff ||
      features.spaServices ||
      features.ecoFriendly ||
      (features.custom && features.custom.length > 0)
        ? features
        : undefined,
    social:
      social.instagram ||
      social.facebook ||
      social.tiktok ||
      social.linkedin ||
      social.youtube ||
      social.x
        ? social
        : undefined,
  };

  const parsedCustomFields = ListingCustomFieldsSchema.safeParse(customFieldsInput);
  if (!parsedCustomFields.success) {
    return { ok: false, message: "Listing profile data is invalid." };
  }

  const statusInput = normalizeText(formData.get("status"));
  const status = statusInput === "published" ? "published" : "draft";

  if (status === "published") {
    const errors: Record<string, string> = {};
    if (!title) {
      errors.title = "Title is required to publish.";
    }
    if (!description) {
      errors.description = "Description is required to publish.";
    }
    if (!category) {
      errors.category = "Category is required to publish.";
    }
    if (!featuredImage) {
      errors.featuredImageUrl = "Featured image is required to publish.";
    }
    if (!address || (!address.street && !address.city && !address.region && !address.country)) {
      errors.address = "Business address is required to publish.";
    }
    if (Object.keys(errors).length > 0) {
      return {
        ok: false,
        message: "Please complete required fields before publishing.",
        errors,
      };
    }
  }

  const bookingProviderIdRaw = normalizeText(formData.get("bookingProviderId"));
  const booking_provider_id = bookingProviderIdRaw && bookingProviderIdRaw.length > 0 ? bookingProviderIdRaw : null;

  const payload = {
    title: title || "",
    slug,
    description: description || null,
    excerpt: excerpt ?? null,
    price: price ?? null,
    currency,
    price_type: priceType ?? null,
    featured_image: featuredImage ?? null,
    video_url: videoUrl ?? null,
    status,
    ...(status === "published" && { published_at: new Date().toISOString() }),
    custom_fields: parsedCustomFields.data,
    ...(address !== undefined && { address }),
    booking_provider_id,
  };

  const { error } = await (supabase.from("listings") as any)
    .update(payload)
    .eq("id", listingId);

  if (error) {
    console.error("update listing error", error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/listings");
  revalidatePath(`/listings/${listingId}`);

  const redirectTo = formData.get("redirectTo")?.toString();
  if (redirectTo === "listings") {
    redirect("/listings");
  }
  return { ok: true };
}

