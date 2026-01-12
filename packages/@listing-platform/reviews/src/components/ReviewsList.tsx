/**
 * Styled Reviews List Component
 * Uses headless component with pre-styled UI
 */

import React from 'react';
import { ReviewsListHeadless } from '../headless/ReviewsList.headless';
import { ReviewCard } from './ReviewCard';
import { cn } from '../utils/cn';
import type { Review, ReviewFilters, ApiError } from '../types';

export interface ReviewsListProps {
  /** Entity ID to fetch reviews for */
  entityId: string;
  /** @deprecated Use entityId instead */
  listingId?: string;
  filters?: ReviewFilters;
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
  /** Show load more button */
  showLoadMore?: boolean;
}

export function ReviewsList({
  entityId,
  listingId,
  filters,
  variant = 'default',
  className,
  showLoadMore = true,
}: ReviewsListProps) {
  // Use entityId, fall back to listingId for backward compatibility
  const resolvedEntityId = entityId || listingId || '';

  return (
    <ReviewsListHeadless
      entityId={resolvedEntityId}
      filters={filters}
      className={className}
      renderList={({ reviews, loading, error, hasMore, loadMore }) => (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} variant={variant} />
          ))}
          
          {showLoadMore && hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMore}
                disabled={loading}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-md',
                  'bg-neutral-100 text-neutral-700',
                  'hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors'
                )}
              >
                {loading ? 'Loading...' : 'Load More Reviews'}
              </button>
            </div>
          )}
        </div>
      )}
      renderEmpty={() => (
        <div className="text-center py-12 text-neutral-500">
          <p className="text-lg font-medium mb-2">No reviews yet</p>
          <p className="text-sm">Be the first to leave a review!</p>
        </div>
      )}
      renderLoading={() => (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}
      renderError={(error: ApiError) => (
        <div className="text-center py-12 text-error-600">
          <p className="font-medium mb-2">Error loading reviews</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}
    />
  );
}
