/**
 * Cal.com booking provider - real integration with self-hosted or cloud Cal.com
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AvailabilitySlot,
  Booking,
  CreateBookingInput,
} from "../types";
import type {
  BookingProvider,
  BookingProviderContext,
  BookingResult,
  CreateBookingRequest,
  HealthCheck,
  SyncResult,
} from "./booking-provider-interface";
import type { CalComCredentials, CalComSettings } from "./calcom-types";
import { CalComApiClient } from "./calcom-client";

type BookingRow = Record<string, unknown>;
type AvailabilityRow = Record<string, unknown>;

function getCredentials(context: BookingProviderContext): CalComCredentials {
  const creds = context.providerCredentials as CalComCredentials | undefined;
  if (!creds?.apiKey) {
    throw new Error("Cal.com provider requires providerCredentials with apiKey");
  }
  return creds;
}

function getSettings(context: BookingProviderContext): CalComSettings {
  return (context.providerSettings || {}) as CalComSettings;
}

function getEventTypeId(context: BookingProviderContext, input: CreateBookingRequest): string {
  const settings = getSettings(context);
  if (settings.calEventTypeId) return String(settings.calEventTypeId);
  if (input.eventTypeId) return input.eventTypeId;
  throw new Error("Cal.com provider requires calEventTypeId in settings or eventTypeId in input");
}

export class CalComProvider implements BookingProvider {
  readonly type = "calcom" as const;

  constructor(private supabase: SupabaseClient<unknown>) {}

  async createBooking(
    context: BookingProviderContext,
    input: CreateBookingRequest
  ): Promise<BookingResult> {
    const creds = getCredentials(context);
    const calEventTypeId = getEventTypeId(context, input);

    const client = new CalComApiClient(creds);

    const startDate = input.startDate;
    const startTime = input.startTime || "09:00";
    const endTime = input.endTime || "17:00";
    const toTime = (t: string) => (t.length === 5 ? `${t}:00` : t);
    const startIso = `${startDate}T${toTime(startTime)}`;
    const endDate = input.endDate || startDate;
    const endIso = `${endDate}T${toTime(endTime)}`;

    const guestEmail =
      (input.guestDetails as { primaryContact?: { email?: string } })?.primaryContact?.email ||
      "";
    const guestName =
      (input.guestDetails as { primaryContact?: { name?: string } })?.primaryContact?.name || "";

    const calRes = await client.createBooking({
      eventTypeId: parseInt(calEventTypeId, 10) || 0,
      start: startIso,
      end: endIso,
      timeZone: input.metadata?.timezone as string || "UTC",
      responses: guestEmail ? { email: guestEmail, name: guestName } : undefined,
      metadata: {
        listingId: input.listingId,
        tenantId: input.tenantId,
      },
    });

    const externalId =
      calRes.uid ||
      calRes.booking?.uid ||
      (calRes.id != null ? String(calRes.id) : null);
    if (!externalId) {
      throw new Error("Cal.com create booking did not return booking id");
    }

    const confirmationCode = `BK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { data, error } = await (this.supabase as any)
      .from("bookings")
      .insert({
        listing_id: input.listingId ?? null,
        user_id: input.userId,
        tenant_id: input.tenantId,
        event_type_id: input.eventTypeId ?? null,
        team_member_id: input.teamMemberId ?? null,
        start_date: input.startDate,
        end_date: input.endDate,
        start_time: input.startTime ?? null,
        end_time: input.endTime ?? null,
        guest_count: input.guestCount,
        guest_details: input.guestDetails ?? null,
        special_requests: input.specialRequests ?? null,
        base_price: input.basePrice ?? 0,
        service_fee: input.serviceFee ?? 0,
        tax_amount: input.taxAmount ?? 0,
        discount_amount: 0,
        total_amount: input.totalAmount ?? 0,
        currency: input.currency ?? "USD",
        payment_status: input.paymentStatus ?? "pending",
        status: input.status ?? "pending",
        external_provider: "calcom",
        external_booking_id: externalId,
        confirmation_code: confirmationCode,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to create local booking record");
    }

    return {
      booking: this.mapBooking(data as BookingRow),
      externalBookingId: externalId,
    };
  }

  async cancelBooking(
    context: BookingProviderContext,
    bookingId: string,
    reason?: string
  ): Promise<void> {
    const { data: booking } = await (this.supabase as any)
      .from("bookings")
      .select("external_booking_id")
      .eq("id", bookingId)
      .single();

    const externalId = (booking as { external_booking_id?: string } | null)?.external_booking_id;
    if (externalId) {
      const creds = getCredentials(context);
      const client = new CalComApiClient(creds);
      await client.cancelBooking(externalId);
    }

    const { error } = await (this.supabase as any)
      .from("bookings")
      .update({
        status: "cancelled",
        cancellation_reason: reason ?? null,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async updateBooking(
    context: BookingProviderContext,
    bookingId: string,
    updates: Partial<Booking>
  ): Promise<Booking> {
    // Sync confirm to Cal.com when status changes to confirmed
    if (updates.status === "confirmed") {
      const { data: row } = await (this.supabase as any)
        .from("bookings")
        .select("external_booking_id, external_provider")
        .eq("id", bookingId)
        .single();
      const externalId = (row as { external_booking_id?: string } | null)?.external_booking_id;
      const isCalcom = (row as { external_provider?: string } | null)?.external_provider === "calcom";
      if (externalId && isCalcom) {
        const creds = getCredentials(context);
        const client = new CalComApiClient(creds);
        await client.confirmBooking(externalId);
      }
    }

    const dbUpdates: Partial<BookingRow> = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.paymentStatus) dbUpdates.payment_status = updates.paymentStatus;
    if (updates.specialRequests !== undefined) dbUpdates.special_requests = updates.specialRequests;
    if (updates.internalNotes !== undefined) dbUpdates.internal_notes = updates.internalNotes;
    if (updates.guestCount !== undefined) dbUpdates.guest_count = updates.guestCount;
    if (updates.guestDetails !== undefined) dbUpdates.guest_details = updates.guestDetails;

    const { data, error } = await (this.supabase as any)
      .from("bookings")
      .update(dbUpdates)
      .eq("id", bookingId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to update booking");
    }
    return this.mapBooking(data as BookingRow);
  }

  async getAvailability(
    context: BookingProviderContext,
    startDate: Date,
    endDate: Date
  ): Promise<AvailabilitySlot[]> {
    const creds = getCredentials(context);
    const settings = getSettings(context);
    const calEventTypeId = settings.calEventTypeId;
    if (!calEventTypeId) {
      return [];
    }

    const client = new CalComApiClient(creds);
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();
    const timeZone = (context as { metadata?: { timezone?: string } }).metadata?.timezone || "UTC";

    const slots = await client.getSlots(calEventTypeId, startIso, endIso, timeZone);

    const listingId = context.listingId || "";
    const tenantId = context.tenantId;

    return slots.map((s, i) => ({
      id: `cal-${s.time}-${i}`,
      listingId,
      tenantId,
      date: s.time.slice(0, 10),
      startTime: s.time.slice(11, 16),
      endTime: undefined,
      available: true,
      maxBookings: 1,
      currentBookings: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  async syncBookings(_context: BookingProviderContext): Promise<SyncResult> {
    return { synced: 0, failed: 0 };
  }

  async healthCheck(context: BookingProviderContext): Promise<HealthCheck> {
    try {
      const creds = getCredentials(context);
      const client = new CalComApiClient(creds);
      await client.getMe();
      return { healthy: true };
    } catch (e) {
      return {
        healthy: false,
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  }

  private mapBooking(row: BookingRow): Booking {
    return {
      id: row.id as string,
      listingId: row.listing_id as string | undefined,
      eventTypeId: row.event_type_id as string | undefined,
      userId: row.user_id as string,
      tenantId: row.tenant_id as string,
      teamMemberId: row.team_member_id as string | undefined,
      startDate: row.start_date as string,
      endDate: row.end_date as string,
      startTime: row.start_time as string | undefined,
      endTime: row.end_time as string | undefined,
      guestCount: (row.guest_count as number) ?? 1,
      guestDetails: row.guest_details as Booking["guestDetails"],
      basePrice: Number(row.base_price ?? 0),
      serviceFee: Number(row.service_fee ?? 0),
      taxAmount: Number(row.tax_amount ?? 0),
      discountAmount: Number(row.discount_amount ?? 0),
      totalAmount: Number(row.total_amount ?? 0),
      currency: (row.currency as string) ?? "USD",
      paymentStatus: (row.payment_status as Booking["paymentStatus"]) ?? "pending",
      status: (row.status as Booking["status"]) ?? "pending",
      confirmationCode: (row.confirmation_code as string) ?? "",
      specialRequests: row.special_requests as string | undefined,
      internalNotes: row.internal_notes as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
