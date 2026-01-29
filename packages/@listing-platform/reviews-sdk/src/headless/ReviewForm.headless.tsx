/**
 * Headless Review Form Component
 * Provides logic and structure only, no styling
 */

import React, { useState } from 'react';
import { useReviewSubmit } from '../hooks/useReviewSubmit';
import type { ReviewFormData, ApiError } from '../types';

export interface ReviewFormHeadlessProps {
  /** Entity ID for the review */
  entityId: string;
  /** @deprecated Use entityId instead */
  listingId?: string;
  onSubmit?: (reviewId: string) => void;
  onCancel?: () => void;
  renderField: (props: {
    name: string;
    label: string;
    type: 'rating' | 'textarea' | 'file';
    value?: any;
    onChange: (value: any) => void;
    error?: string;
  }) => React.ReactNode;
  renderSubmit?: (props: {
    isSubmitting: boolean;
    onSubmit: () => void;
  }) => React.ReactNode;
  renderCancel?: (props: {
    onCancel: () => void;
  }) => React.ReactNode;
  renderError?: (error: ApiError) => React.ReactNode;
  renderSuccess?: (message: string) => React.ReactNode;
  className?: string;
}

export function ReviewFormHeadless({
  entityId,
  listingId,
  onSubmit,
  onCancel,
  renderField,
  renderSubmit,
  renderCancel,
  renderError,
  renderSuccess,
  className,
}: ReviewFormHeadlessProps) {
  // Use entityId, fall back to listingId for backward compatibility
  const resolvedEntityId = entityId || listingId || '';

  const { submitReview, isSubmitting, error } = useReviewSubmit({
    onSuccess: (review) => {
      console.log('[ReviewFormHeadless] Review submitted successfully:', review);
      // Reset form after successful submission
      setRating(0);
      setComment('');
      setPhotos([]);
      setFieldErrors({});
      if (onSubmit) {
        onSubmit(review.id);
      }
    },
    onError: (err) => {
      console.error('[ReviewFormHeadless] Review submission error:', err);
    },
  });
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    console.log('[ReviewFormHeadless] handleSubmit called', { e: !!e, rating, comment: comment.substring(0, 50), photoCount: photos.length });
    if (e) {
      e.preventDefault();
    }

    // Validation
    const errors: Record<string, string> = {};
    if (rating < 1 || rating > 5) {
      console.warn('[ReviewFormHeadless] Validation failed: invalid rating', rating);
      errors.rating = 'Please select a rating';
    }

    if (Object.keys(errors).length > 0) {
      console.error('[ReviewFormHeadless] Validation errors:', errors);
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    const formData: ReviewFormData = {
      entityId: resolvedEntityId,
      rating,
      comment: comment.trim() || undefined,
      photos: photos.length > 0 ? photos : undefined,
    };

    console.log('[ReviewFormHeadless] Submitting review:', formData);
    const review = await submitReview(formData);
    console.log('[ReviewFormHeadless] Submit result:', review);
    
    if (review) {
      setSuccessMessage('Review submitted successfully! Thank you for your feedback.');
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    }
  };

  return (
    <form className={className} onSubmit={handleSubmit} noValidate>
      {renderField({
        name: 'rating',
        label: 'Rating',
        type: 'rating',
        value: rating,
        onChange: setRating,
        error: fieldErrors.rating,
      })}

      {renderField({
        name: 'comment',
        label: 'Comment',
        type: 'textarea',
        value: comment,
        onChange: setComment,
        error: fieldErrors.comment,
      })}

      {renderField({
        name: 'photos',
        label: 'Photos',
        type: 'file',
        value: photos,
        onChange: setPhotos,
        error: fieldErrors.photos,
      })}

      {successMessage && (
        renderSuccess ? (
          renderSuccess(successMessage)
        ) : (
          <div 
            role="alert" 
            aria-live="polite"
            className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        )
      )}

      {error && renderError && (
        <div role="alert" aria-live="polite">
          {renderError(error)}
        </div>
      )}

      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        {renderSubmit ? (
          renderSubmit({
            isSubmitting,
            onSubmit: () => handleSubmit(),
          })
        ) : (
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        )}

        {onCancel && renderCancel && (
          renderCancel({
            onCancel,
          })
        )}
      </div>
    </form>
  );
}
