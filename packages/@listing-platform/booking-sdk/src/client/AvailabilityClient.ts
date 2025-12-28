import { BaseClient } from './BaseClient';
import type { BookingSDKConfig } from '../config/client';

export interface AvailabilitySlot {
  id: string;
  listingId: string;
  eventTypeId?: string;
  teamMemberId?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  available: boolean;
  maxBookings: number;
  currentBookings: number;
  price?: number;
  minDuration?: number;
  maxDuration?: number;
  timezone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityFilters {
  listingId: string;
  eventTypeId?: string;
  teamMemberId?: string;
  startDate: string;
  endDate: string;
  timezone?: string;
  availableOnly?: boolean;
}

export interface GenerateRecurringSlotsInput {
  patternId: string;
  startDate: string;
  endDate: string;
}

export class AvailabilityClient extends BaseClient {
  constructor(config: BookingSDKConfig) {
    super(config);
  }

  /**
   * Get availability slots
   */
  async getAvailability(filters: AvailabilityFilters): Promise<{ slots: AvailabilitySlot[] }> {
    const params = new URLSearchParams({
      listingId: filters.listingId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });
    
    if (filters.eventTypeId) params.append('eventTypeId', filters.eventTypeId);
    if (filters.teamMemberId) params.append('teamMemberId', filters.teamMemberId);
    if (filters.timezone) params.append('timezone', filters.timezone);
    if (filters.availableOnly) params.append('availableOnly', 'true');

    const response = await this.get<{ slots: AvailabilitySlot[] }>(
      `/api/booking/availability?${params.toString()}`
    );
    return response;
  }

  /**
   * Generate recurring slots from a pattern
   */
  async generateRecurringSlots(input: GenerateRecurringSlotsInput): Promise<{
    slots: AvailabilitySlot[];
    count: number;
  }> {
    const response = await this.post<{ slots: AvailabilitySlot[]; count: number }>(
      '/api/booking/availability/generate',
      input
    );
    return response;
  }

  /**
   * Update an availability slot
   */
  async updateAvailabilitySlot(
    id: string,
    updates: Partial<AvailabilitySlot>
  ): Promise<AvailabilitySlot> {
    const response = await this.patch<{ slot: AvailabilitySlot }>(
      `/api/booking/availability/${id}`,
      updates
    );
    return response.slot;
  }

  /**
   * Bulk update availability slots
   */
  async bulkUpdateAvailability(
    slots: Array<{ id: string } & Partial<AvailabilitySlot>>
  ): Promise<{ updated: number }> {
    const response = await this.post<{ updated: number }>(
      '/api/booking/availability/bulk',
      { slots }
    );
    return response;
  }
}

