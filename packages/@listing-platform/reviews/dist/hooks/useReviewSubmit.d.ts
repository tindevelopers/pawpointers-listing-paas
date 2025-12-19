/**
 * Hook for submitting reviews
 */
import type { ReviewFormData, Review } from '../types';
export interface UseReviewSubmitResult {
    submitReview: (data: ReviewFormData) => Promise<Review | null>;
    isSubmitting: boolean;
    error: Error | null;
}
export declare function useReviewSubmit(): UseReviewSubmitResult;
//# sourceMappingURL=useReviewSubmit.d.ts.map