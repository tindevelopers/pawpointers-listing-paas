import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { createBookingProvider } from "@listing-platform/booking/providers";
import { withRateLimit } from "@/middleware/api-rate-limit";
import { sendEmail } from "@tinadmin/core/email";
import { bookingCancellationEmailParams } from "@listing-platform/booking";

export const dynamic = "force-dynamic";

function getAdminClientOrNull(): ReturnType<typeof createAdminClient> | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/** Consumer cancel: use user client + RLS; admin only for Cal.com credentials. */
async function handler(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { bookingId, reason } = body;

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "bookingId is required" },
        { status: 400 }
      );
    }

    // RLS "Users can view their own bookings" – only their row is returned
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, user_id, listing_id, status, tenant_id")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    if ((booking as { user_id?: string }).user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "You can only cancel your own bookings" },
        { status: 403 }
      );
    }

    const status = (booking as { status?: string }).status;
    if (status === "cancelled" || status === "completed") {
      return NextResponse.json(
        { success: false, error: `Booking is already ${status}` },
        { status: 400 }
      );
    }

    const tenantId = (booking as { tenant_id?: string }).tenant_id;
    const listingId = (booking as { listing_id?: string }).listing_id;

    let providerType: "builtin" | "gohighlevel" | "calcom" = "builtin";
    let bookingProviderId: string | undefined;
    if (listingId) {
      const { data: listing } = await supabase
        .from("listings")
        .select("booking_provider_id")
        .eq("id", listingId)
        .single();
      bookingProviderId = (listing as { booking_provider_id?: string } | null)?.booking_provider_id;
      if (bookingProviderId) {
        const adminClient = getAdminClientOrNull();
        if (adminClient) {
          const { data: integration } = await adminClient
            .from("booking_provider_integrations")
            .select("provider")
            .eq("id", bookingProviderId)
            .single();
          const provider = (integration as { provider?: string } | null)?.provider;
          if (provider) {
            providerType = provider as "builtin" | "gohighlevel" | "calcom";
          }
        }
      }
    }

    let context: Record<string, unknown> = {
      supabase,
      tenantId,
      listingId,
      userId: user.id,
    };

    if (providerType === "calcom" && tenantId) {
      const adminClient = getAdminClientOrNull();
      if (!adminClient) {
        return NextResponse.json(
          { success: false, error: "Cal.com cancel is not configured. Set SUPABASE_SERVICE_ROLE_KEY." },
          { status: 503 }
        );
      }
      // Prefer integration linked via booking_provider_id when set
      let integration: { credentials?: Record<string, unknown> | null; settings?: Record<string, unknown> | null } | null = null;
      if (bookingProviderId) {
        const { data: direct } = await adminClient
          .from("booking_provider_integrations")
          .select("credentials, settings")
          .eq("id", bookingProviderId)
          .eq("provider", "calcom")
          .eq("active", true)
          .single();
        integration = direct as typeof integration;
      }
      if (!integration?.credentials) {
        const { data: integrations } = await adminClient
          .from("booking_provider_integrations")
          .select("id, credentials, settings, listing_id")
          .eq("tenant_id", tenantId)
          .eq("provider", "calcom")
          .eq("active", true);
        const integrationsList =
          ((integrations || []) as Array<{
            id: string;
            credentials?: Record<string, unknown> | null;
            settings?: Record<string, unknown> | null;
            listing_id?: string | null;
          }>);
        integration =
          integrationsList.find(
            (i: { listing_id?: string | null }) => i.listing_id === listingId
          ) ??
          integrationsList.find(
            (i: { listing_id?: string | null }) => i.listing_id == null
          ) ??
          integrationsList[0];
      }

      if (integration?.credentials) {
        context.providerCredentials = integration.credentials as Record<string, unknown>;
        context.providerSettings = integration.settings as Record<string, unknown>;
      }
      context.supabase = adminClient;
    }

    const provider = createBookingProvider(providerType, (context.supabase as any) as any);
    await provider.cancelBooking(context as any, bookingId, reason);

    // Send cancellation email to customer (fire-and-forget)
    const customerEmail = (user as { email?: string }).email;
    if (customerEmail) {
      const { data: fullBooking } = await (context.supabase as any)
        .from("bookings")
        .select("start_date, start_time, guest_details")
        .eq("id", bookingId)
        .single();
      const { data: listingRow } = await (context.supabase as any)
        .from("listings")
        .select("title")
        .eq("id", (booking as { listing_id?: string }).listing_id)
        .single();
      if (fullBooking && listingRow) {
        const gd = (fullBooking as { guest_details?: { primaryContact?: { name?: string } } }).guest_details;
        sendEmail(
          bookingCancellationEmailParams({
            customerEmail,
            customerName: gd?.primaryContact?.name,
            listingTitle: (listingRow as { title?: string })?.title || "Your appointment",
            startDate: (fullBooking as { start_date: string }).start_date,
            startTime: (fullBooking as { start_time?: string }).start_time,
          })
        ).catch((err) => console.error("[booking/cancel] Email error:", err));
      }
    }

    try {
      await ((context.supabase as any).from("bookings") as any)
        .update({
          cancelled_by: user.id,
          cancellation_reason: reason ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
    } catch {
      // Best effort only; primary cancellation is handled by provider.
    }

    return NextResponse.json({
      success: true,
      data: { bookingId, status: "cancelled" },
    });
  } catch (error: unknown) {
    console.error("[POST /api/booking/cancel] Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to cancel booking";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export const POST = withRateLimit(handler, "/api/booking/cancel");
