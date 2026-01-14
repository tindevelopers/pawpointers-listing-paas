/**
 * useReviews Hook
 * Fetches reviews for an entity with support for filters, pagination, and real-time updates
 */
import type { Review, ReviewFilters, ApiError } from '../types';
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
export declare function useReviews(entityIdOrListingId: string, optionsOrFilters?: UseReviewsOptions | ReviewFilters): UseReviewsResult;
//# sourceMappingURL=useReviews.d.ts.map