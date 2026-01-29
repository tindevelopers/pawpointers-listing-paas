/**
 * useReviewSubmit Hook
 * Handles review submission with optimistic updates and error handling
 */

import { useState, useCallback } from 'react';
import type { Review, ReviewFormData, ApiError } from '../types';
import { normalizeEntityId } from '../types';
import { useReviewsClient } from '../sdk';

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
export function useReviewSubmit(
  options: UseReviewSubmitOptions = {}
): UseReviewSubmitResult {
  const client = useReviewsClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [submittedReview, setSubmittedReview] = useState<Review | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const submitReview = useCallback(async (data: ReviewFormData): Promise<Review | null> => {
    console.log('[useReviewSubmit] Starting review submission', { data });
    setIsSubmitting(true);
    setError(null);

    try {
      // Ensure we have an entityId
      const entityId = normalizeEntityId(data.entityId, data.listingId);
      console.log('[useReviewSubmit] Normalized entityId:', entityId);
      
      const reviewData = {
        ...data,
        entityId,
      };
      console.log('[useReviewSubmit] Calling client.createReview with:', reviewData);
      
      const response = await client.createReview(reviewData);
      console.log('[useReviewSubmit] Client response:', response);

      if (response.error) {
        console.error('[useReviewSubmit] Error in response:', response.error);
        setError(response.error);
        options.onError?.(response.error);
        return null;
      }

      const review = response.data;
      console.log('[useReviewSubmit] Review submitted successfully:', review);
      setSubmittedReview(review);
      options.onSuccess?.(review);
      return review;
    } catch (err) {
      console.error('[useReviewSubmit] Exception caught:', err);
      const apiError: ApiError = {
        code: 'SUBMIT_ERROR',
        message: err instanceof Error ? err.message : 'Failed to submit review',
      };
      setError(apiError);
      options.onError?.(apiError);
      return null;
    } finally {
      setIsSubmitting(false);
      console.log('[useReviewSubmit] Submission finished');
    }
  }, [client, options]);

  return {
    submitReview,
    isSubmitting,
    error,
    clearError,
    submittedReview,
  };
}
