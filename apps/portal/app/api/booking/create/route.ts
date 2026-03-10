import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { createBookingProvider } from "@listing-platform/booking/providers";
import { withRateLimit } from "@/middleware/api-rate-limit";
import { sendEmail } from "@tinadmin/core/email";
import {
  bookingConfirmationEmailParams,
  newBookingAlertEmailParams,
} from "@listing-platform/booking";

export const dynamic = "force-dynamic";

/** Admin client only when needed (e.g. Cal.com credentials). Consumer booking uses user client + RLS. */
function getAdminClientOrNull(): ReturnType<typeof createAdminClient> | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/**
 * POST /api/booking/create
 * Create a booking for a listing (portal consumer flow).
 * Uses the authenticated user's Supabase client and RLS; admin client only for external provider credentials.
 */
async function handler(req: NextRequest) {
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

    const body = await req.json();
    const {
      listingId,
      listing_id,
      eventTypeId,
      event_type_id,
      startDate,
      start_date,
      endDate,
      end_date,
      startTime,
      start_time,
      endTime,
      end_time,
      guestCount = 1,
      guest_count,
      guestDetails,
      guest_details,
      specialRequests,
      special_requests,
    } = body;

    const lid = listingId || listing_id;
    const start = startDate || start_date;
    const end = endDate || end_date;
    const st = startTime || start_time;
    const et = endTime || end_time;
    const gc = guestCount ?? guest_count ?? 1;
    const gd = guestDetails || guest_details;
    const sr = specialRequests || special_requests;

    // Merge authenticated user's email/name into guestDetails for Cal.com
    const guestDetailsWithUser = {
      guests: [] as { name: string; age?: number; specialRequirements?: string }[],
      primaryContact: {
        email: (gd as { primaryContact?: { email?: string } })?.primaryContact?.email || user.email || "",
        name: (gd as { primaryContact?: { name?: string } })?.primaryContact?.name || (user.user_metadata?.full_name as string) || "",
      },
    };

    if (!lid || !start || !end) {
      return NextResponse.json(
        { success: false, error: "listingId, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    if (new Date(end) < new Date(start)) {
      return NextResponse.json(
        { success: false, error: "endDate must be after startDate" },
        { status: 400 }
      );
    }

    // Consumer flow: use user's client (RLS applies). Public can view published listings.
    const { data: listing } = await supabase
      .from("listings")
      .select("id, tenant_id, booking_provider_id")
      .eq("id", lid)
      .single();

    if (!listing) {
      return NextResponse.json(
        { success: false, error: "Listing not found" },
        { status: 404 }
      );
    }

    const tenantId = (listing as { tenant_id?: string }).tenant_id;
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "Listing has no tenant" },
        { status: 400 }
      );
    }

    let providerType: "builtin" | "gohighlevel" | "calcom" = "builtin";
    const bookingProviderId = (listing as { booking_provider_id?: string }).booking_provider_id;
    if (bookingProviderId) {
      // Resolve provider type: need admin only to read integration (credentials are protected by RLS).
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

    const evtId = eventTypeId || event_type_id;
    let basePrice = 0;
    let currency = "USD";
    if (evtId) {
      const { data: eventType } = await supabase
        .from("event_types")
        .select("price, currency")
        .eq("id", evtId)
        .single();
      if (eventType) {
        basePrice = (eventType as { price?: number }).price || 0;
        currency = (eventType as { currency?: string }).currency || "USD";
      }
    }
    const serviceFee = basePrice * 0.1;
    const taxAmount = (basePrice + serviceFee) * 0.08;
    const totalAmount = basePrice + serviceFee + taxAmount;

    if (providerType === "calcom") {
      const adminClient = getAdminClientOrNull();
      if (!adminClient) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Cal.com booking is not configured for this environment. " +
              "Set SUPABASE_SERVICE_ROLE_KEY in .env.local for listings that use Cal.com.",
          },
          { status: 503 }
        );
      }
      // Prefer integration linked via booking_provider_id when set
      type IntegrationRow = { credentials?: Record<string, unknown> | null; settings?: Record<string, unknown> | null };
      let integration: IntegrationRow | null | undefined = null;
      if (bookingProviderId) {
        const { data: direct } = await adminClient
          .from("booking_provider_integrations")
          .select("credentials, settings")
          .eq("id", bookingProviderId)
          .eq("provider", "calcom")
          .eq("active", true)
          .single();
        integration = direct as IntegrationRow | null;
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
          (integrationsList.find(
            (i: { listing_id?: string | null }) => i.listing_id === lid
          ) ??
          integrationsList.find(
            (i: { listing_id?: string | null }) => i.listing_id == null
          ) ??
          integrationsList[0]) as IntegrationRow | undefined;
      }

      if (!integration?.credentials) {
        return NextResponse.json(
          {
            success: false,
            error: "Cal.com integration not configured for this listing",
          },
          { status: 400 }
        );
      }

      const bookProvider = createBookingProvider("calcom", adminClient as any);
      const context = {
        supabase: adminClient as any,
        tenantId,
        listingId: lid,
        userId: user.id,
        providerCredentials: integration.credentials as Record<string, unknown>,
        providerSettings: integration.settings as Record<string, unknown>,
      };
      const result = await bookProvider.createBooking(context, {
        listingId: lid,
        eventTypeId: evtId,
        userId: user.id,
        tenantId,
        startDate: start,
        endDate: end,
        startTime: st,
        endTime: et,
        guestCount: gc,
        guestDetails: guestDetailsWithUser,
        specialRequests: sr,
        basePrice,
        serviceFee,
        taxAmount,
        totalAmount,
        currency,
        metadata: { timezone: (body as { timezone?: string }).timezone || "UTC" },
      });

      const b = result.booking;
      // Send confirmation email (fire-and-forget)
      const customerEmail = (user as { email?: string }).email;
      if (customerEmail) {
        const { data: listingRow } = await adminClient
          .from("listings")
          .select("title")
          .eq("id", lid)
          .single();
        const listingTitle = (listingRow as { title?: string } | null)?.title || "Your appointment";
        sendEmail(
          bookingConfirmationEmailParams({
            customerEmail,
            customerName: (user as { user_metadata?: { full_name?: string } }).user_metadata?.full_name,
            listingTitle,
            startDate: start,
            startTime: st || undefined,
            confirmationCode: (b as { confirmation_code?: string }).confirmation_code,
          })
        ).catch((err) => console.error("[booking/create] Email error:", err));
        // New booking alert to merchant (if we have owner email)
        const { data: listingForOwner } = await adminClient
          .from("listings")
          .select("owner_id")
          .eq("id", lid)
          .single();
        const ownerId = (listingForOwner as { owner_id?: string } | null)?.owner_id;
        if (ownerId) {
          const { data: ownerUser } = await adminClient.from("users").select("email").eq("id", ownerId).single();
          const merchantEmail = (ownerUser as { email?: string } | null)?.email;
          if (merchantEmail && merchantEmail !== customerEmail) {
            sendEmail(
              newBookingAlertEmailParams({
                customerEmail,
                customerName: (gd as { primaryContact?: { name?: string } })?.primaryContact?.name,
                listingTitle,
                startDate: start,
                startTime: st || undefined,
                confirmationCode: (b as { confirmation_code?: string }).confirmation_code,
                merchantEmail,
              })
            ).catch((err) => console.error("[booking/create] Merchant email error:", err));
          }
        }
      }
      return NextResponse.json({
        success: true,
        data: { bookingId: b.id, booking: b },
      });
    }

    // Builtin provider: use user's client so RLS "Users can create bookings" (user_id = auth.uid()) applies.
    const provider = createBookingProvider("builtin", supabase as any);
    const result = await provider.createBooking(
      {
        supabase: supabase as any,
        tenantId,
        listingId: lid,
        userId: user.id,
      },
      {
        listingId: lid,
        eventTypeId: evtId,
        userId: user.id,
        tenantId,
        startDate: start,
        endDate: end,
        startTime: st,
        endTime: et,
        guestCount: gc,
        guestDetails: guestDetailsWithUser,
        specialRequests: sr,
        basePrice,
        serviceFee,
        taxAmount,
        totalAmount,
        currency,
      }
    );

    const b = result.booking;
    // Send confirmation email for builtin (fire-and-forget)
    const adminForEmail = getAdminClientOrNull();
    const customerEmail = (user as { email?: string }).email;
    if (customerEmail && adminForEmail) {
      const { data: listingRow } = await supabase
        .from("listings")
        .select("title, owner_id")
        .eq("id", lid)
        .single();
      const listingTitle = (listingRow as { title?: string } | null)?.title || "Your appointment";
      sendEmail(
        bookingConfirmationEmailParams({
          customerEmail,
          customerName: (user as { user_metadata?: { full_name?: string } }).user_metadata?.full_name,
          listingTitle,
          startDate: start,
          startTime: st || undefined,
          confirmationCode: (b as { confirmation_code?: string }).confirmation_code,
        })
      ).catch((err) => console.error("[booking/create] Email error:", err));
      const ownerId = (listingRow as { owner_id?: string } | null)?.owner_id;
      if (ownerId) {
        const { data: ownerRow } = await adminForEmail.from("users").select("email").eq("id", ownerId).single();
        const merchantEmail = (ownerRow as { email?: string } | null)?.email;
        if (merchantEmail && merchantEmail !== customerEmail) {
          sendEmail(
            newBookingAlertEmailParams({
              customerEmail,
              customerName: (gd as { primaryContact?: { name?: string } })?.primaryContact?.name,
              listingTitle,
              startDate: start,
              startTime: st || undefined,
              confirmationCode: (b as { confirmation_code?: string }).confirmation_code,
              merchantEmail,
            })
          ).catch((err) => console.error("[booking/create] Merchant email error:", err));
        }
      }
    }
    return NextResponse.json({
      success: true,
      data: { bookingId: b.id, booking: b },
    });
  } catch (error: unknown) {
    console.error("[POST /api/booking/create] Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create booking";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export const POST = withRateLimit(handler, "/api/booking/create");
