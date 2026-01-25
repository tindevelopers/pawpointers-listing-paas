import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@tinadmin/core/database";
import type {
  AvailabilitySlot,
  Booking,
  CreateBookingInput,
} from "../types";

export type BookingProviderType = "builtin" | "gohighlevel" | "calcom";

export interface BookingProviderContext {
  supabase: SupabaseClient<Database>;
  tenantId: string;
  listingId?: string;
  userId?: string;
}

export interface CreateBookingRequest extends CreateBookingInput {
  userId: string;
  tenantId: string;
  eventTypeId?: string;
  teamMemberId?: string | null;
  metadata?: Record<string, any>;
  basePrice?: number;
  serviceFee?: number;
  taxAmount?: number;
  totalAmount?: number;
  currency?: string;
  status?: Booking["status"];
  paymentStatus?: Booking["paymentStatus"];
}

export interface BookingResult {
  booking: Booking;
  externalBookingId?: string | null;
}

export interface SyncResult {
  synced: number;
  failed: number;
  errors?: string[];
}

export interface HealthCheck {
  healthy: boolean;
  error?: string;
}

export interface BookingProvider {
  type: BookingProviderType;
  createBooking(
    context: BookingProviderContext,
    input: CreateBookingRequest
  ): Promise<BookingResult>;

  cancelBooking(
    context: BookingProviderContext,
    bookingId: string,
    reason?: string
  ): Promise<void>;

  updateBooking(
    context: BookingProviderContext,
    bookingId: string,
    updates: Partial<Booking>
  ): Promise<Booking>;

  getAvailability(
    context: BookingProviderContext,
    startDate: Date,
    endDate: Date
  ): Promise<AvailabilitySlot[]>;

  syncBookings(context: BookingProviderContext): Promise<SyncResult>;

  healthCheck(context: BookingProviderContext): Promise<HealthCheck>;
}


