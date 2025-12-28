'use client';

import { useState, useCallback } from 'react';

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

export interface UseCalendarSyncResult {
  integrations: CalendarIntegration[];
  loading: boolean;
  error: Error | null;
  connectCalendar: (input: CreateCalendarIntegrationInput) => Promise<CalendarIntegration>;
  syncCalendar: (integrationId: string) => Promise<void>;
  disconnectCalendar: (integrationId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook for managing calendar integrations
 */
export function useCalendarSync(listingId: string): UseCalendarSyncResult {
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchIntegrations = useCallback(async () => {
    if (!listingId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/booking/calendar/integrations?listingId=${listingId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch calendar integrations');
      }

      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  const connectCalendar = useCallback(
    async (input: CreateCalendarIntegrationInput): Promise<CalendarIntegration> => {
      try {
        const response = await fetch('/api/booking/calendar/integrations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to connect calendar');
        }

        const data = await response.json();
        const newIntegration = data.integration;
        setIntegrations((prev) => [newIntegration, ...prev]);
        return newIntegration;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    []
  );

  const syncCalendar = useCallback(async (integrationId: string): Promise<void> => {
    try {
      const response = await fetch('/api/booking/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ integrationId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to sync calendar');
      }

      // Refetch to get updated sync status
      await fetchIntegrations();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    }
  }, [fetchIntegrations]);

  const disconnectCalendar = useCallback(async (integrationId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/booking/calendar/integrations/${integrationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to disconnect calendar');
      }

      setIntegrations((prev) => prev.filter((int) => int.id !== integrationId));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    }
  }, []);

  return {
    integrations,
    loading,
    error,
    connectCalendar,
    syncCalendar,
    disconnectCalendar,
    refetch: fetchIntegrations,
  };
}

