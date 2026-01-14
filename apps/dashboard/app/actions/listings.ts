"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/core/database/server";

export async function listListings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("listings")
    .select("id, title, slug, status, price, currency, featured_image, updated_at")
    .eq("owner_id", user.id)
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

  if (!title) throw new Error("Title is required");

  const { data: userRow } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  const payload = {
    title,
    slug: slugInput ? slugify(slugInput) : slugify(title),
    description,
    status,
    price,
    currency,
    featured_image: featuredImage,
  };

  if (id) {
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

export async function deleteListing(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) {
    console.error("delete listing error", error);
  }

  revalidatePath("/listings");
}

export async function addListingImage(formData: FormData) {
  const listingId = formData.get("listing_id")?.toString();
  const imageUrl = formData.get("image_url")?.toString();
  if (!listingId || !imageUrl) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await (supabase.from("listing_images") as any).insert({
    listing_id: listingId,
    storage_key: imageUrl,
    cdn_url: imageUrl,
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
  const imageUrl = String(formData.get("imageUrl") || "").trim();
  const altText = String(formData.get("altText") || "").trim();

  if (!listingId || !imageUrl) {
    throw new Error("Listing and image URL are required");
  }

  const { error } = await supabase
    .from("listing_images")
    // @ts-expect-error Supabase type inference
    .insert({
      listing_id: listingId,
      storage_key: imageUrl,
      cdn_url: imageUrl,
      alt_text: altText || null,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/media");
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

  if (!entityId || !target) {
    throw new Error("entityId and target are required");
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, tenant_id, owner_id")
    .eq("id", entityId)
    .single();

  if (!listing || (listing as any).owner_id !== user.id) {
    throw new Error("Not authorized to manage this listing");
  }

  const { error } = await (supabase.from("external_review_sources") as any).upsert({
    entity_id: entityId,
    tenant_id: (listing as any).tenant_id || null,
    provider: "dataforseo",
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

async function ensureUniqueSlug(supabase: Awaited<ReturnType<typeof createClient>>, tenantId: string | null, base: string) {
  let candidate = base;
  let attempt = 1;
  while (true) {
    const { data } = await supabase
      .from("listings")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
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

  const { error } = await (supabase
    .from("listings") as any)
    .insert({
      title,
      slug,
      description,
      status: "draft",
      owner_id: user!.id,
      tenant_id: tenantId,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/listings");
}

