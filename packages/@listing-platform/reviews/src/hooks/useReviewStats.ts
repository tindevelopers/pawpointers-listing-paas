/**
 * Hook for fetching review statistics
 */

import { useState, useEffect, useCallback } from 'react';
import type { ReviewStats } from '../types';

export interface UseReviewStatsResult {
  stats: ReviewStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useReviewStats(listingId: string): UseReviewStatsResult {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/reviews/stats/${listingId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch review stats: ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data.stats || data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}

