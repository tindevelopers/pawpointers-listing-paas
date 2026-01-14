/**
 * useReviewSubmit Hook
 * Handles review submission with optimistic updates and error handling
 */
import type { Review, ReviewFormData, ApiError } from '../types';
export interface UseReviewSubmitOptions {
    /** Callback on successful submission */
    onSuccess?: (review: Review) => void;
    /** Callback on error */
    onError?: (error: ApiError) => void;
}
export interface UseReviewSubmitResult {
    /** Submit a review */
    submitReview: (data: ReviewFormData) => Promise<Review | null>;
    /** Whether a submission is in progress */
    isSubmitting: boolean;
    /** Last error encountered */
    error: ApiError | null;
    /** Clear the error state */
    clearError: () => void;
    /** Last successfully submitted review */
    submittedReview: Review | null;
}
/**
 * Hook to handle review submission
 *
 * @param options - Hook options
 *
 * @example
 * ```tsx
 * const { submitReview, isSubmitting, error } = useReviewSubmit({
 *   onSuccess: (review) => console.log('Review created:', review.id)
 * });
 *
 * const handleSubmit = async (formData) => {
 *   await submitReview({
 *     entityId: 'entity-123',
 *     rating: 5,
 *     comment: 'Great!'
 *   });
 * };
 * ```
 */
export declare function useReviewSubmit(options?: UseReviewSubmitOptions): UseReviewSubmitResult;
//# sourceMappingURL=useReviewSubmit.d.ts.map