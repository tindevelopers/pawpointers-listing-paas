/**
 * Headless Reviews List Component
 * Provides logic and structure only, no styling
 */

import React from 'react';
import { useReviews, type UseReviewsOptions } from '../hooks/useReviews';
import type { Review, ReviewFilters, ApiError } from '../types';

export interface ReviewsListHeadlessProps {
  /** Entity ID to fetch reviews for */
  entityId: string;
  /** @deprecated Use entityId instead */
  listingId?: string;
  /** Initial filters */
  filters?: ReviewFilters;
  /** Hook options */
  options?: Omit<UseReviewsOptions, 'filters'>;
  /** Render prop for the list container */
  renderList: (props: {
    reviews: Review[];
    loading: boolean;
    error: ApiError | null;
    hasMore: boolean;
    total: number;
    loadMore: () => void;
    refetch: () => void;
  }) => React.ReactNode;
  /** Render prop for individual review items */
  renderItem?: (review: Review, index: number) => React.ReactNode;
  /** Render prop for loading state */
  renderLoading?: () => React.ReactNode;
  /** Render prop for error state */
  renderError?: (error: ApiError) => React.ReactNode;
  /** Render prop for empty state */
  renderEmpty?: () => React.ReactNode;
  className?: string;
}

export function ReviewsListHeadless({
  entityId,
  listingId,
  filters,
  options,
  renderList,
  renderItem,
  renderLoading,
  renderError,
  renderEmpty,
  className,
}: ReviewsListHeadlessProps) {
  // Use entityId, fall back to listingId for backward compatibility
  const resolvedEntityId = entityId || listingId || '';

  const { reviews, loading, error, hasMore, total, loadMore, refetch } = useReviews(
    resolvedEntityId,
    { filters, ...options }
  );

  // Show loading state
  if (loading && reviews.length === 0) {
    if (renderLoading) {
      return <div className={className}>{renderLoading()}</div>;
    }
    return <div className={className}>Loading reviews...</div>;
  }

  // Show error state
  if (error && reviews.length === 0) {
    if (renderError) {
      return <div className={className}>{renderError(error)}</div>;
    }
    return (
      <div className={className} role="alert">
        Error loading reviews: {error.message}
      </div>
    );
  }

  // Show empty state
  if (!loading && reviews.length === 0) {
    if (renderEmpty) {
      return <div className={className}>{renderEmpty()}</div>;
    }
    return <div className={className}>No reviews yet</div>;
  }

  // Render the list with render props
  return (
    <div className={className}>
      {renderList({
        reviews,
        loading,
        error,
        hasMore,
        total,
        loadMore,
        refetch,
      })}
    </div>
  );
}
