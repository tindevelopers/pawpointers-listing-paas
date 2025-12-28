'use client';

import { useState, useCallback } from 'react';

export interface RecurringPattern {
  id: string;
  eventTypeId: string;
  listingId: string;
  tenantId: string;
  pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  weekOfMonth?: number[];
  monthOfYear?: number[];
  startTime?: string;
  endTime?: string;
  startDate: string;
  endDate?: string;
  occurrences?: number;
  exceptionDates?: string[];
  timezone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringPatternInput {
  eventTypeId: string;
  listingId: string;
  pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  weekOfMonth?: number[];
  monthOfYear?: number[];
  startTime?: string;
  endTime?: string;
  startDate: string;
  endDate?: string;
  occurrences?: number;
  exceptionDates?: string[];
  timezone?: string;
}

export interface UseRecurringPatternsResult {
  patterns: RecurringPattern[];
  loading: boolean;
  error: Error | null;
  createPattern: (input: CreateRecurringPatternInput) => Promise<RecurringPattern>;
  generateSlots: (patternId: string, startDate: string, endDate: string) => Promise<any[]>;
  refetch: () => Promise<void>;
}

/**
 * Hook for managing recurring patterns
 */
export function useRecurringPatterns(eventTypeId: string): UseRecurringPatternsResult {
  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPatterns = useCallback(async () => {
    if (!eventTypeId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/booking/recurring-patterns?eventTypeId=${eventTypeId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch recurring patterns');
      }

      const data = await response.json();
      setPatterns(data.patterns || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [eventTypeId]);

  const createPattern = useCallback(
    async (input: CreateRecurringPatternInput): Promise<RecurringPattern> => {
      try {
        const response = await fetch('/api/booking/recurring-patterns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create recurring pattern');
        }

        const data = await response.json();
        const newPattern = data.pattern;
        setPatterns((prev) => [newPattern, ...prev]);
        return newPattern;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    []
  );

  const generateSlots = useCallback(
    async (patternId: string, startDate: string, endDate: string): Promise<any[]> => {
      try {
        const response = await fetch('/api/booking/availability/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ patternId, startDate, endDate }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to generate slots');
        }

        const data = await response.json();
        return data.slots || [];
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    []
  );

  return {
    patterns,
    loading,
    error,
    createPattern,
    generateSlots,
    refetch: fetchPatterns,
  };
}

