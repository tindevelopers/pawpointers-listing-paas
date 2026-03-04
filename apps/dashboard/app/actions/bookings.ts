"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { createBookingProvider } from "../../../../packages/@listing-platform/booking/src/providers/provider-factory";
import { canManageBookingForListing } from "@/lib/listing-access";

type ProviderType = "builtin" | "gohighlevel" | "calcom";

async function resolveMerchantBookingContext(bookingId: string, userId: string) {
  const adminClient = createAdminClient();

  const { data: booking } = await adminClient
    .from("bookings")
    .select("id, listing_id, status, tenant_id")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    throw new Error("Booking not found");
  }

  const listingId = (booking as { listing_id?: string | null }).listing_id;
  if (!listingId) {
    throw new Error("Booking has no listing");
  }

  const canManage = await canManageBookingForListing(userId, listingId);
  if (!canManage) {
    throw new Error("Not authorized to manage this booking");
  }

  let providerType: ProviderType = "builtin";
  const { data: listing } = await adminClient
    .from("listings")
    .select("booking_provider_id")
    .eq("id", listingId)
    .maybeSingle();

  const bookingProviderId = (listing as { booking_provider_id?: string | null } | null)?.booking_provider_id;
  let providerCredentials: Record<string, unknown> | undefined;
  let providerSettings: Record<string, unknown> | undefined;

  if (bookingProviderId) {
    const { data: integration } = await adminClient
      .from("booking_provider_integrations")
      .select("provider, credentials, settings")
      .eq("id", bookingProviderId)
      .maybeSingle();

    const provider = (integration as { provider?: ProviderType } | null)?.provider;
    if (provider) {
      providerType = provider;
    }
    providerCredentials = (integration as { credentials?: Record<string, unknown> } | null)?.credentials;
    providerSettings = (integration as { settings?: Record<string, unknown> } | null)?.settings;
  }

  const context = {
    supabase: adminClient as any,
    tenantId: (booking as { tenant_id?: string | null }).tenant_id || null,
    listingId,
    userId,
    providerCredentials,
    providerSettings,
  };

  return {
    booking: booking as { id: string; status: string; listing_id: string; tenant_id?: string | null },
    providerType,
    provider: createBookingProvider(providerType, adminClient as any),
    context,
  };
}

export async function confirmBookingAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") || "");
  if (!bookingId) throw new Error("bookingId is required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { booking, provider, context } = await resolveMerchantBookingContext(bookingId, user.id);
  if (booking.status !== "pending") {
    throw new Error("Only pending bookings can be confirmed");
  }

  await provider.updateBooking(context as any, bookingId, { status: "confirmed" } as any);
  revalidatePath("/bookings");
}

export async function completeBookingAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") || "");
  if (!bookingId) throw new Error("bookingId is required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { booking, provider, context } = await resolveMerchantBookingContext(bookingId, user.id);
  if (booking.status !== "confirmed") {
    throw new Error("Only confirmed bookings can be completed");
  }

  await provider.updateBooking(context as any, bookingId, { status: "completed" } as any);
  revalidatePath("/bookings");
}

export async function cancelBookingAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") || "");
  const reason = String(formData.get("reason") || "").trim() || undefined;
  if (!bookingId) throw new Error("bookingId is required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { booking, provider, context } = await resolveMerchantBookingContext(bookingId, user.id);
  if (!["pending", "confirmed"].includes(booking.status)) {
    throw new Error("Only pending or confirmed bookings can be cancelled");
  }

  await provider.cancelBooking(context as any, bookingId, reason);
  await (createAdminClient().from("bookings") as any)
    .update({
      cancelled_by: user.id,
      cancellation_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);
  revalidatePath("/bookings");
}

export async function updateBookingNotesAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") || "");
  const notes = String(formData.get("notes") || "");
  if (!bookingId) throw new Error("bookingId is required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { provider, context } = await resolveMerchantBookingContext(bookingId, user.id);
  await provider.updateBooking(context as any, bookingId, { internalNotes: notes } as any);
  revalidatePath("/bookings");
}
