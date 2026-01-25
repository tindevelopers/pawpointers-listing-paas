import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@tinadmin/core/database";
import type {
  AvailabilitySlot,
  Booking,
  CreateBookingInput,
} from "../types";
import type {
  BookingProvider,
  BookingProviderContext,
  BookingProviderType,
  BookingResult,
  CreateBookingRequest,
  HealthCheck,
  SyncResult,
} from "./booking-provider-interface";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
type AvailabilityRow = Database["public"]["Tables"]["availability_slots"]["Row"];

export class LocalBookingProvider implements BookingProvider {
  constructor(
    private providerType: BookingProviderType,
    private supabase: SupabaseClient<Database>
  ) {}

  get type(): BookingProviderType {
    return this.providerType;
  }

  async createBooking(
    context: BookingProviderContext,
    input: CreateBookingRequest
  ): Promise<BookingResult> {
    const { data, error } = await this.supabase
      .from("bookings")
      .insert({
        listing_id: input.listingId,
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
        external_provider: this.providerType === "builtin" ? null : this.providerType,
        external_booking_id: null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to create booking");
    }

    return {
      booking: this.mapBooking(data),
      externalBookingId: data.external_booking_id,
    };
  }

  async cancelBooking(
    _context: BookingProviderContext,
    bookingId: string,
    reason?: string
  ): Promise<void> {
    const { error } = await this.supabase
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
    _context: BookingProviderContext,
    bookingId: string,
    updates: Partial<Booking>
  ): Promise<Booking> {
    const dbUpdates: Partial<BookingRow> = {};

    if (updates.status) dbUpdates.status = updates.status;
    if (updates.paymentStatus) dbUpdates.payment_status = updates.paymentStatus;
    if (updates.specialRequests !== undefined) dbUpdates.special_requests = updates.specialRequests;
    if (updates.internalNotes !== undefined) dbUpdates.internal_notes = updates.internalNotes;
    if (updates.guestCount !== undefined) dbUpdates.guest_count = updates.guestCount;
    if (updates.guestDetails !== undefined) dbUpdates.guest_details = updates.guestDetails as any;

    const { data, error } = await this.supabase
      .from("bookings")
      .update(dbUpdates)
      .eq("id", bookingId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Failed to update booking");
    }

    return this.mapBooking(data);
  }

  async getAvailability(
    _context: BookingProviderContext,
    startDate: Date,
    endDate: Date
  ): Promise<AvailabilitySlot[]> {
    const { data, error } = await this.supabase
      .from("availability_slots")
      .select("*")
      .gte("date", startDate.toISOString().slice(0, 10))
      .lte("date", endDate.toISOString().slice(0, 10));

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map(this.mapAvailability);
  }

  async syncBookings(_context: BookingProviderContext): Promise<SyncResult> {
    // Local provider has nothing external to sync
    return { synced: 0, failed: 0 };
  }

  async healthCheck(_context: BookingProviderContext): Promise<HealthCheck> {
    return { healthy: true };
  }

  private mapBooking(row: BookingRow): Booking {
    return {
      id: row.id,
      listingId: row.listing_id ?? undefined,
      eventTypeId: row.event_type_id ?? undefined,
      userId: row.user_id!,
      tenantId: row.tenant_id!,
      teamMemberId: (row as any).team_member_id ?? undefined,
      startDate: row.start_date,
      endDate: row.end_date,
      startTime: row.start_time ?? undefined,
      endTime: row.end_time ?? undefined,
      timezone: (row as any).timezone ?? undefined,
      guestCount: row.guest_count ?? 1,
      guestDetails: (row as any).guest_details ?? undefined,
      formResponses: (row as any).form_responses ?? undefined,
      basePrice: Number(row.base_price ?? 0),
      serviceFee: Number(row.service_fee ?? 0),
      taxAmount: Number(row.tax_amount ?? 0),
      discountAmount: Number(row.discount_amount ?? 0),
      totalAmount: Number(row.total_amount ?? 0),
      currency: row.currency ?? "USD",
      paymentStatus: (row.payment_status as Booking["paymentStatus"]) ?? "pending",
      paymentIntentId: row.payment_intent_id ?? undefined,
      paymentMethod: row.payment_method ?? undefined,
      paidAt: row.paid_at ?? undefined,
      status: (row.status as Booking["status"]) ?? "pending",
      confirmationCode: row.confirmation_code ?? "",
      videoMeetingId: row.video_meeting_id ?? undefined,
      videoMeetingProvider: (row as any).video_meeting_provider ?? undefined,
      videoMeetingUrl: (row as any).video_meeting_url ?? undefined,
      videoMeetingPassword: (row as any).video_meeting_password ?? undefined,
      videoMeetingData: (row as any).video_meeting_data ?? undefined,
      cancelledAt: row.cancelled_at ?? undefined,
      cancelledBy: row.cancelled_by ?? undefined,
      cancellationReason: row.cancellation_reason ?? undefined,
      refundAmount: Number(row.refund_amount ?? 0),
      specialRequests: row.special_requests ?? undefined,
      internalNotes: row.internal_notes ?? undefined,
      createdAt: row.created_at!,
      updatedAt: row.updated_at!,
    };
  }

  private mapAvailability(row: AvailabilityRow): AvailabilitySlot {
    return {
      id: row.id,
      listingId: row.listing_id!,
      tenantId: row.tenant_id!,
      date: row.date,
      startTime: row.start_time ?? undefined,
      endTime: row.end_time ?? undefined,
      available: row.available ?? false,
      maxBookings: row.max_bookings ?? 1,
      currentBookings: row.current_bookings ?? 0,
      price: row.price ?? undefined,
      minDuration: row.min_duration ?? undefined,
      maxDuration: row.max_duration ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: row.created_at!,
      updatedAt: row.updated_at!,
    };
  }
}

export class GoHighLevelProvider extends LocalBookingProvider {
  constructor(supabase: SupabaseClient<Database>) {
    super("gohighlevel", supabase);
  }
}

export class CalComProvider extends LocalBookingProvider {
  constructor(supabase: SupabaseClient<Database>) {
    super("calcom", supabase);
  }
}


