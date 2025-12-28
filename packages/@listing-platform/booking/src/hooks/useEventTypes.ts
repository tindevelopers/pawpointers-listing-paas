'use client';

import { useState, useEffect, useCallback } from 'react';

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

export interface UseEventTypesResult {
  eventTypes: EventType[];
  loading: boolean;
  error: Error | null;
  createEventType: (input: CreateEventTypeInput) => Promise<EventType>;
  updateEventType: (id: string, input: Partial<CreateEventTypeInput>) => Promise<EventType>;
  deleteEventType: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook for managing event types
 */
export function useEventTypes(listingId: string, options?: { activeOnly?: boolean }): UseEventTypesResult {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEventTypes = useCallback(async () => {
    if (!listingId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ listingId });
      if (options?.activeOnly) {
        params.append('activeOnly', 'true');
      }

      const response = await fetch(`/api/booking/event-types?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch event types');
      }

      const data = await response.json();
      setEventTypes(data.eventTypes || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [listingId, options?.activeOnly]);

  useEffect(() => {
    fetchEventTypes();
  }, [fetchEventTypes]);

  const createEventType = useCallback(async (input: CreateEventTypeInput): Promise<EventType> => {
    try {
      const response = await fetch('/api/booking/event-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create event type');
      }

      const data = await response.json();
      const newEventType = data.eventType;
      setEventTypes((prev) => [newEventType, ...prev]);
      return newEventType;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    }
  }, []);

  const updateEventType = useCallback(
    async (id: string, input: Partial<CreateEventTypeInput>): Promise<EventType> => {
      try {
        const response = await fetch(`/api/booking/event-types/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to update event type');
        }

        const data = await response.json();
        const updatedEventType = data.eventType;
        setEventTypes((prev) =>
          prev.map((et) => (et.id === id ? updatedEventType : et))
        );
        return updatedEventType;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    []
  );

  const deleteEventType = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/booking/event-types/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete event type');
      }

      setEventTypes((prev) => prev.filter((et) => et.id !== id));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    }
  }, []);

  return {
    eventTypes,
    loading,
    error,
    createEventType,
    updateEventType,
    deleteEventType,
    refetch: fetchEventTypes,
  };
}

