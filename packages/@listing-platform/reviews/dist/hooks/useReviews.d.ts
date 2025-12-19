/**
 * Hook for fetching reviews
 */
import type { Review, ReviewFilters } from '../types';
export interface UseReviewsResult {
    reviews: Review[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}
export declare function useReviews(listingId: string, filters?: ReviewFilters): UseReviewsResult;
//# sourceMappingURL=useReviews.d.ts.map