/**
 * Types for Booking SDK
 */

export interface Booking {
  id: string;
  listingId?: string;
  eventTypeId?: string;
  userId: string;
  tenantId: string;
  teamMemberId?: string;
  
  // Booking details
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  
  // Guests
  guestCount: number;
  guestDetails?: GuestDetails;
  formResponses?: Record<string, any>;
  
  // Pricing
  basePrice: number;
  serviceFee: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  
  // Payment
  paymentStatus: PaymentStatus;
  paymentIntentId?: string;
  paymentMethod?: string;
  paidAt?: string;
  
  // Status
  status: BookingStatus;
  confirmationCode: string;
  
  // Video Meeting
  videoMeetingId?: string;
  videoMeetingProvider?: 'zoom' | 'microsoft_teams';
  videoMeetingUrl?: string;
  videoMeetingPassword?: string;
  videoMeetingData?: Record<string, any>;
  
  // Cancellation
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  refundAmount?: number;
  
  // Communication
  specialRequests?: string;
  internalNotes?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface GuestDetails {
  guests: Guest[];
  primaryContact?: {
    name: string;
    email: string;
    phone?: string;
  };
}

export interface Guest {
  name: string;
  age?: number;
  specialRequirements?: string;
}

export type BookingStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'cancelled' 
  | 'completed' 
  | 'no_show';

export type PaymentStatus = 
  | 'pending' 
  | 'processing' 
  | 'paid' 
  | 'failed' 
  | 'refunded';

export interface AvailabilitySlot {
  id: string;
  listingId: string;
  tenantId: string;
  
  // Date/time
  date: string;
  startTime?: string;
  endTime?: string;
  
  // Availability
  available: boolean;
  maxBookings: number;
  currentBookings: number;
  
  // Pricing
  price?: number;
  minDuration?: number;
  maxDuration?: number;
  
  // Metadata
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface BookingFilters {
  status?: BookingStatus | BookingStatus[];
  paymentStatus?: PaymentStatus | PaymentStatus[];
  startDate?: string;
  endDate?: string;
  listingId?: string;
  userId?: string;
  sortBy?: 'created_at' | 'start_date' | 'total_amount';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface AvailabilityFilters {
  startDate: string;
  endDate: string;
  listingId?: string;
  availableOnly?: boolean;
}

export interface BookingFormData {
  listingId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  guestCount: number;
  guestDetails?: GuestDetails;
  specialRequests?: string;
}

export interface BookingPricing {
  basePrice: number;
  nights: number;
  subtotal: number;
  serviceFee: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
}

export interface BookingCalendarDay {
  date: string;
  available: boolean;
  price?: number;
  minStay?: number;
  status: 'available' | 'unavailable' | 'booked' | 'partial';
}

export interface CreateBookingInput {
  listingId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  guestCount: number;
  guestDetails?: GuestDetails;
  specialRequests?: string;
  paymentMethodId?: string;
}

export interface CancelBookingInput {
  bookingId: string;
  reason?: string;
}

export interface BookingConfig {
  allowInstantBooking: boolean;
  requireApproval: boolean;
  enableWaitlist: boolean;
  paymentProcessor: 'stripe' | 'paypal' | 'square';
  depositRequired: boolean;
  depositPercentage: number;
  cancellationWindow: number;
  reminderEmails: boolean;
  reminderHoursBefore: number[];
}

export type BookingType = 'location' | 'meeting' | 'hybrid';

export type VideoProvider = 'none' | 'zoom' | 'microsoft_teams';

export interface EventType {
  id: string;
  listingId?: string;
  userId?: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  durationMinutes: number;
  price?: number;
  currency: string;
  bufferBefore: number;
  bufferAfter: number;
  requiresConfirmation: boolean;
  requiresPayment: boolean;
  instantBooking: boolean;
  customQuestions: any[];
  recurringConfig?: any;
  timezone: string;
  metadata: Record<string, any>;
  bookingType: BookingType;
  videoProvider: VideoProvider;
  videoSettings?: Record<string, any>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VideoMeeting {
  id: string;
  provider: 'zoom' | 'microsoft_teams';
  meetingUrl: string;
  password?: string;
  meetingId: string;
  startTime: string;
  duration: number;
  topic?: string;
  joinUrl: string;
  hostUrl?: string;
  metadata: Record<string, any>;
}

export interface VideoIntegration {
  id: string;
  userId: string;
  tenantId?: string;
  provider: 'zoom' | 'microsoft_teams';
  accountEmail?: string;
  accountName?: string;
  autoCreateMeetings: boolean;
  defaultMeetingSettings: Record<string, any>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  listingId: string;
  userId: string;
  tenantId: string;
  role: 'owner' | 'member' | 'viewer';
  eventTypeIds: string[];
  availabilityOverride?: any;
  roundRobinEnabled: boolean;
  roundRobinWeight: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
