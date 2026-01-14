export interface ListingReadRepository {
  getFeaturedListings(limit?: number): Promise<any[]>;
  getListingById(id: string): Promise<any | null>;
  getListingBySlug(slug: string): Promise<any | null>;
  searchListings(params: Record<string, any>): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>;
}

export interface SearchGateway {
  search(params: {
    q?: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
    filters?: Record<string, any>;
    page?: number;
    perPage?: number;
  }): Promise<{ hits: any[]; found: number; page: number; perPage: number }>;
}

export interface BookingProvider {
  getAvailability(params: Record<string, any>): Promise<{ slots: any[] }>;
  createBooking(params: Record<string, any>): Promise<{ bookingId: string }>;
  cancelBooking?(params: Record<string, any>): Promise<{ cancelled: boolean }>;
}

export class NotImplementedBookingProvider implements BookingProvider {
  async getAvailability(_params: Record<string, any>): Promise<{ slots: any[] }> {
    throw new Error('BOOKING_NOT_IMPLEMENTED');
  }
  async createBooking(_params: Record<string, any>): Promise<{ bookingId: string }> {
    throw new Error('BOOKING_NOT_IMPLEMENTED');
  }
  async cancelBooking(_params: Record<string, any>): Promise<{ cancelled: boolean }> {
    throw new Error('BOOKING_NOT_IMPLEMENTED');
  }
}

