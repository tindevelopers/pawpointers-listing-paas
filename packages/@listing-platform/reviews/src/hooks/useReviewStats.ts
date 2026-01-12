/**
 * useReviewStats Hook
 * Fetches review statistics for an entity
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ReviewStats, ApiError } from '../types';
import { useReviewsClient } from '../sdk';

export interface UseReviewStatsOptions {
  /** Skip initial fetch (manual trigger) */
  skip?: boolean;
  /** Poll interval in ms (0 = disabled) */
  pollInterval?: number;
}

export interface UseReviewStatsResult {
  stats: ReviewStats | null;
  loading: boolean;
  error: ApiError | null;
  /** Refetch stats */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch review statistics for an entity
 * 
 * @param entityId - The entity ID to fetch stats for
 * @param options - Hook options
 * 
 * @example
 * ```tsx
 * const { stats, loading, error } = useReviewStats('entity-123');
 * if (stats) {
 *   console.log(`Average rating: ${stats.averageRating}`);
 * }
 * ```
 */
export function useReviewStats(
  entityId: string,
  options: UseReviewStatsOptions = {}
): UseReviewStatsResult {
  const client = useReviewsClient();
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<ApiError | null>(null);

  // AbortController ref for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchStats = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const response = await client.getStats(
        entityId,
        abortControllerRef.current.signal
      );

      if (response.error) {
        setError(response.error);
        return;
      }

      setStats(response.data);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError({
        code: 'FETCH_ERROR',
        message: err instanceof Error ? err.message : 'Failed to fetch stats',
      });
    } finally {
      setLoading(false);
    }
  }, [client, entityId]);

  const refetch = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  // Initial fetch
  useEffect(() => {
    if (!options.skip) {
      fetchStats();
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [entityId, options.skip]); // eslint-disable-line react-hooks/exhaustive-deps

  // Optional polling
  useEffect(() => {
    if (!options.pollInterval || options.pollInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchStats();
    }, options.pollInterval);

    return () => clearInterval(intervalId);
  }, [options.pollInterval, fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch,
  };
}
