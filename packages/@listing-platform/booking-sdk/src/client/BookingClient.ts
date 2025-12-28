import { BaseClient } from './BaseClient';
import type { BookingSDKConfig } from '../config/client';

export interface Booking {
  id: string;
  listingId: string;
  userId: string;
  tenantId: string;
  eventTypeId?: string;
  teamMemberId?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  guestCount: number;
  guestDetails?: any;
  basePrice: number;
  serviceFee: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  paymentStatus: string;
  paymentIntentId?: string;
  paymentMethod?: string;
  paidAt?: string;
  status: string;
  confirmationCode: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  refundAmount?: number;
  specialRequests?: string;
  internalNotes?: string;
  formResponses?: Record<string, any>;
  timezone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingInput {
  listingId: string;
  eventTypeId?: string;
  teamMemberId?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  guestCount: number;
  guestDetails?: any;
  formResponses?: Record<string, any>;
  specialRequests?: string;
  paymentMethodId?: string;
  timezone?: string;
}

export interface UpdateBookingInput {
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  guestCount?: number;
  guestDetails?: any;
  formResponses?: Record<string, any>;
  specialRequests?: string;
}

export interface BookingFilters {
  status?: string | string[];
  paymentStatus?: string | string[];
  startDate?: string;
  endDate?: string;
  listingId?: string;
  userId?: string;
  eventTypeId?: string;
  teamMemberId?: string;
  sortBy?: 'created_at' | 'start_date' | 'total_amount';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export class BookingClient extends BaseClient {
  constructor(config: BookingSDKConfig) {
    super(config);
  }

  /**
   * Create a booking
   */
  async createBooking(input: CreateBookingInput): Promise<Booking> {
    const response = await this.post<{ booking: Booking }>('/api/booking/bookings', {
      listingId: input.listingId,
      eventTypeId: input.eventTypeId,
      teamMemberId: input.teamMemberId,
      startDate: input.startDate,
      endDate: input.endDate,
      startTime: input.startTime,
      endTime: input.endTime,
      guestCount: input.guestCount,
      guestDetails: input.guestDetails,
      formResponses: input.formResponses,
      specialRequests: input.specialRequests,
      paymentMethodId: input.paymentMethodId,
      timezone: input.timezone,
    });
    return response.booking;
  }

  /**
   * Get booking by ID
   */
  async getBooking(id: string): Promise<Booking> {
    const response = await this.get<{ booking: Booking }>(`/api/booking/bookings/${id}`);
    return response.booking;
  }

  /**
   * List bookings with filters
   */
  async listBookings(filters?: BookingFilters): Promise<{ bookings: Booking[]; total?: number }> {
    const params = new URLSearchParams();
    
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        filters.status.forEach(s => params.append('status', s));
      } else {
        params.append('status', filters.status);
      }
    }
    
    if (filters?.paymentStatus) {
      if (Array.isArray(filters.paymentStatus)) {
        filters.paymentStatus.forEach(s => params.append('paymentStatus', s));
      } else {
        params.append('paymentStatus', filters.paymentStatus);
      }
    }
    
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.listingId) params.append('listingId', filters.listingId);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.eventTypeId) params.append('eventTypeId', filters.eventTypeId);
    if (filters?.teamMemberId) params.append('teamMemberId', filters.teamMemberId);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));

    const response = await this.get<{ bookings: Booking[]; total?: number }>(
      `/api/booking/bookings?${params.toString()}`
    );
    return response;
  }

  /**
   * Update a booking
   */
  async updateBooking(id: string, input: UpdateBookingInput): Promise<Booking> {
    const response = await this.patch<{ booking: Booking }>(`/api/booking/bookings/${id}`, input);
    return response.booking;
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(id: string, reason?: string): Promise<Booking> {
    const response = await this.post<{ booking: Booking }>(
      `/api/booking/bookings/${id}/cancel`,
      { reason }
    );
    return response.booking;
  }

  /**
   * Confirm a pending booking
   */
  async confirmBooking(id: string): Promise<Booking> {
    const response = await this.post<{ booking: Booking }>(
      `/api/booking/bookings/${id}/confirm`
    );
    return response.booking;
  }

  /**
   * Calculate pricing for a booking
   */
  async calculatePricing(input: {
    listingId: string;
    eventTypeId?: string;
    startDate: string;
    endDate: string;
    guestCount: number;
  }): Promise<{
    basePrice: number;
    nights?: number;
    subtotal: number;
    serviceFee: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
    currency: string;
  }> {
    const response = await this.post<{ pricing: any }>('/api/booking/bookings/pricing', input);
    return response.pricing;
  }
}

