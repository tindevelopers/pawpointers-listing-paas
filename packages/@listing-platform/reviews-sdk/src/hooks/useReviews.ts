/**
 * useReviews Hook
 * Fetches reviews for an entity with support for filters, pagination, and real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Review, ReviewFilters, ApiError } from '../types';
import { normalizeEntityId } from '../types';
import { useReviewsClient } from '../sdk';

export interface UseReviewsOptions {
  /** Initial filters to apply */
  filters?: ReviewFilters;
  /** Skip initial fetch (manual trigger) */
  skip?: boolean;
  /** Poll interval in ms (0 = disabled) */
  pollInterval?: number;
}

export interface UseReviewsResult {
  reviews: Review[];
  loading: boolean;
  error: ApiError | null;
  hasMore: boolean;
  total: number;
  /** Refetch reviews with current filters */
  refetch: () => Promise<void>;
  /** Load more reviews (pagination) */
  loadMore: () => Promise<void>;
  /** Update filters and refetch */
  setFilters: (filters: ReviewFilters) => void;
}

/**
 * Hook to fetch and manage reviews for an entity
 * 
 * @param entityId - The entity ID to fetch reviews for
 * @param listingId - @deprecated Use entityId instead
 * @param options - Hook options
 * 
 * @example
 * ```tsx
 * const { reviews, loading, error, loadMore } = useReviews('entity-123', {
 *   filters: { sortBy: 'date', sortOrder: 'desc' }
 * });
 * ```
 */
export function useReviews(
  entityIdOrListingId: string,
  optionsOrFilters?: UseReviewsOptions | ReviewFilters
): UseReviewsResult {
  // Normalize input - support legacy (listingId, filters) signature
  const normalizedEntityId = entityIdOrListingId;
  const options: UseReviewsOptions = 
    optionsOrFilters && ('filters' in optionsOrFilters || 'skip' in optionsOrFilters || 'pollInterval' in optionsOrFilters)
      ? optionsOrFilters as UseReviewsOptions
      : { filters: optionsOrFilters as ReviewFilters };

  const client = useReviewsClient();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<ApiError | null>(null);
  const [filters, setFiltersState] = useState<ReviewFilters>(options.filters || {});
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // AbortController ref for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchReviews = useCallback(async (append = false) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    setLoading(true);
    if (!append) {
      setError(null);
    }

    try {
      const currentOffset = append ? reviews.length : 0;
      const requestFilters: ReviewFilters = {
        ...filters,
        offset: currentOffset,
        limit: filters.limit || 10,
      };

      const response = await client.getReviews(
        normalizedEntityId,
        requestFilters,
        abortControllerRef.current.signal
      );

      if (response.error) {
        setError(response.error);
        return;
      }

      const newReviews = response.data || [];
      const totalCount = response.meta?.total || newReviews.length;

      if (append) {
        setReviews((prev) => [...prev, ...newReviews]);
      } else {
        setReviews(newReviews);
      }

      setTotal(totalCount);
      setHasMore(currentOffset + newReviews.length < totalCount);
      setError(null);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError({
        code: 'FETCH_ERROR',
        message: err instanceof Error ? err.message : 'Failed to fetch reviews',
      });
    } finally {
      setLoading(false);
    }
  }, [client, normalizedEntityId, filters, reviews.length]);

  const refetch = useCallback(async () => {
    await fetchReviews(false);
  }, [fetchReviews]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchReviews(true);
  }, [fetchReviews, hasMore, loading]);

  const setFilters = useCallback((newFilters: ReviewFilters) => {
    setFiltersState(newFilters);
    // Reset offset when filters change
    setReviews([]);
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!options.skip) {
      fetchReviews(false);
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [normalizedEntityId, filters, options.skip]); // eslint-disable-line react-hooks/exhaustive-deps

  // Optional polling
  useEffect(() => {
    if (!options.pollInterval || options.pollInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchReviews(false);
    }, options.pollInterval);

    return () => clearInterval(intervalId);
  }, [options.pollInterval, fetchReviews]);

  return {
    reviews,
    loading,
    error,
    hasMore,
    total,
    refetch,
    loadMore,
    setFilters,
  };
}
