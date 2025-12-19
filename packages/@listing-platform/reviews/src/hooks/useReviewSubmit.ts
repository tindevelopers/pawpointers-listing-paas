/**
 * Hook for submitting reviews
 */

import { useState } from 'react';
import type { ReviewFormData, Review } from '../types';

export interface UseReviewSubmitResult {
  submitReview: (data: ReviewFormData) => Promise<Review | null>;
  isSubmitting: boolean;
  error: Error | null;
}

export function useReviewSubmit(): UseReviewSubmitResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submitReview = async (data: ReviewFormData): Promise<Review | null> => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Create FormData for file uploads
      const formData = new FormData();
      formData.append('listingId', data.listingId);
      formData.append('rating', data.rating.toString());
      
      if (data.comment) {
        formData.append('comment', data.comment);
      }

      if (data.photos && data.photos.length > 0) {
        data.photos.forEach((photo, index) => {
          formData.append(`photos[${index}]`, photo);
        });
      }

      const response = await fetch('/api/reviews', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to submit review: ${response.statusText}`);
      }

      const review = await response.json();
      return review;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitReview,
    isSubmitting,
    error,
  };
}

