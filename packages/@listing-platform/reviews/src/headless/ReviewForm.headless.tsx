/**
 * Headless Review Form Component
 * Provides logic and structure only, no styling
 */

import React, { useState } from 'react';
import { useReviewSubmit } from '../hooks/useReviewSubmit';
import type { ReviewFormData } from '../types';

export interface ReviewFormHeadlessProps {
  listingId: string;
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
  renderError?: (error: Error) => React.ReactNode;
  className?: string;
}

export function ReviewFormHeadless({
  listingId,
  onSubmit,
  onCancel,
  renderField,
  renderSubmit,
  renderCancel,
  renderError,
  className,
}: ReviewFormHeadlessProps) {
  const { submitReview, isSubmitting, error } = useReviewSubmit();
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Validation
    const errors: Record<string, string> = {};
    if (rating < 1 || rating > 5) {
      errors.rating = 'Please select a rating';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    const formData: ReviewFormData = {
      listingId,
      rating,
      comment: comment.trim() || undefined,
      photos: photos.length > 0 ? photos : undefined,
    };

    const review = await submitReview(formData);
    
    if (review && onSubmit) {
      onSubmit(review.id);
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

      {error && renderError && (
        <div role="alert" aria-live="polite">
          {renderError(error)}
        </div>
      )}

      <div>
        {renderSubmit ? (
          renderSubmit({
            isSubmitting,
            onSubmit: () => handleSubmit(),
          })
        ) : (
          <button type="submit" disabled={isSubmitting}>
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

