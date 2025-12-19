/**
 * Headless Reviews List Component
 * Provides logic and structure only, no styling
 */

import React from 'react';
import { useReviews } from '../hooks/useReviews';
import type { Review, ReviewFilters } from '../types';

export interface ReviewsListHeadlessProps {
  listingId: string;
  filters?: ReviewFilters;
  renderReview: (review: Review) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: Error) => React.ReactNode;
  className?: string;
}

export function ReviewsListHeadless({
  listingId,
  filters,
  renderReview,
  renderEmpty,
  renderLoading,
  renderError,
  className,
}: ReviewsListHeadlessProps) {
  const { reviews, isLoading, error } = useReviews(listingId, filters);

  if (isLoading) {
    return (
      <div className={className} role="status" aria-label="Loading reviews">
        {renderLoading ? renderLoading() : <div>Loading reviews...</div>}
      </div>
    );
  }

  if (error) {
    return (
      <div className={className} role="alert" aria-live="polite">
        {renderError ? renderError(error) : <div>Error: {error.message}</div>}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className={className} role="status" aria-label="No reviews">
        {renderEmpty ? renderEmpty() : <div>No reviews yet</div>}
      </div>
    );
  }

  return (
    <div className={className} role="list" aria-label="Reviews">
      {reviews.map((review) => (
        <div key={review.id} role="listitem">
          {renderReview(review)}
        </div>
      ))}
    </div>
  );
}

