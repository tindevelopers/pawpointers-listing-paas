import { BaseClient } from './BaseClient';
import type { BookingSDKConfig } from '../config/client';

export interface CalendarIntegration {
  id: string;
  listingId: string;
  userId: string;
  tenantId: string;
  provider: 'google' | 'outlook' | 'apple' | 'ical';
  calendarId: string;
  calendarName?: string;
  syncEnabled: boolean;
  syncDirection: 'import' | 'export' | 'bidirectional';
  lastSyncedAt?: string;
  lastSyncError?: string;
  syncFrequencyMinutes: number;
  timezone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarIntegrationInput {
  listingId: string;
  userId: string;
  provider: 'google' | 'outlook' | 'apple' | 'ical';
  calendarId: string;
  calendarName?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  syncDirection?: 'import' | 'export' | 'bidirectional';
  timezone?: string;
}

export class CalendarClient extends BaseClient {
  constructor(config: BookingSDKConfig) {
    super(config);
  }

  /**
   * List calendar integrations for a listing
   */
  async listIntegrations(listingId: string): Promise<CalendarIntegration[]> {
    const params = new URLSearchParams({ listingId });
    const response = await this.get<{ integrations: CalendarIntegration[] }>(
      `/api/booking/calendar/integrations?${params.toString()}`
    );
    return response.integrations;
  }

  /**
   * Get calendar integration by ID
   */
  async getIntegration(id: string): Promise<CalendarIntegration> {
    const response = await this.get<{ integration: CalendarIntegration }>(
      `/api/booking/calendar/integrations/${id}`
    );
    return response.integration;
  }

  /**
   * Connect a calendar
   */
  async connectCalendar(input: CreateCalendarIntegrationInput): Promise<CalendarIntegration> {
    const response = await this.post<{ integration: CalendarIntegration }>(
      '/api/booking/calendar/integrations',
      input
    );
    return response.integration;
  }

  /**
   * Sync calendar (trigger manual sync)
   */
  async syncCalendar(integrationId: string): Promise<{ message: string }> {
    const response = await this.post<{ message: string }>('/api/booking/calendar/sync', {
      integrationId,
    });
    return response;
  }

  /**
   * Update calendar integration
   */
  async updateIntegration(
    id: string,
    updates: Partial<CreateCalendarIntegrationInput> & { syncEnabled?: boolean }
  ): Promise<CalendarIntegration> {
    const response = await this.patch<{ integration: CalendarIntegration }>(
      `/api/booking/calendar/integrations/${id}`,
      updates
    );
    return response.integration;
  }

  /**
   * Disconnect calendar integration
   */
  async disconnectCalendar(id: string): Promise<void> {
    await this.delete(`/api/booking/calendar/integrations/${id}`);
  }
}

