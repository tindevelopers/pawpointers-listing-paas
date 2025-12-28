import { BaseClient } from './BaseClient';
import type { BookingSDKConfig } from '../config/client';

export interface EventType {
  id: string;
  listingId: string;
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
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventTypeInput {
  listingId: string;
  name: string;
  slug: string;
  description?: string;
  durationMinutes: number;
  price?: number;
  currency?: string;
  bufferBefore?: number;
  bufferAfter?: number;
  requiresConfirmation?: boolean;
  requiresPayment?: boolean;
  instantBooking?: boolean;
  customQuestions?: any[];
  recurringConfig?: any;
  timezone?: string;
  metadata?: Record<string, any>;
}

export interface UpdateEventTypeInput extends Partial<CreateEventTypeInput> {
  active?: boolean;
}

export class EventTypeClient extends BaseClient {
  constructor(config: BookingSDKConfig) {
    super(config);
  }

  /**
   * List event types for a listing
   */
  async listEventTypes(listingId: string, options?: { activeOnly?: boolean }): Promise<EventType[]> {
    const params = new URLSearchParams({ listingId });
    if (options?.activeOnly) {
      params.append('activeOnly', 'true');
    }
    
    const response = await this.get<{ eventTypes: EventType[] }>(
      `/api/booking/event-types?${params.toString()}`
    );
    return response.eventTypes;
  }

  /**
   * Get event type by ID
   */
  async getEventType(id: string): Promise<EventType> {
    const response = await this.get<{ eventType: EventType }>(`/api/booking/event-types/${id}`);
    return response.eventType;
  }

  /**
   * Create an event type
   */
  async createEventType(input: CreateEventTypeInput): Promise<EventType> {
    const response = await this.post<{ eventType: EventType }>('/api/booking/event-types', input);
    return response.eventType;
  }

  /**
   * Update an event type
   */
  async updateEventType(id: string, input: UpdateEventTypeInput): Promise<EventType> {
    const response = await this.patch<{ eventType: EventType }>(
      `/api/booking/event-types/${id}`,
      input
    );
    return response.eventType;
  }

  /**
   * Delete an event type
   */
  async deleteEventType(id: string): Promise<void> {
    await this.delete(`/api/booking/event-types/${id}`);
  }
}

