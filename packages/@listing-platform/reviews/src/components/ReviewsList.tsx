/**
 * Styled Reviews List Component
 * Uses headless component with pre-styled UI
 */

import React from 'react';
import { ReviewsListHeadless } from '../headless/ReviewsList.headless';
import { ReviewCard } from './ReviewCard';
import { cn } from '../utils/cn';
import type { Review, ReviewFilters } from '../types';

export interface ReviewsListProps {
  listingId: string;
  filters?: ReviewFilters;
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
}

export function ReviewsList({
  listingId,
  filters,
  variant = 'default',
  className,
}: ReviewsListProps) {
  return (
    <ReviewsListHeadless
      listingId={listingId}
      filters={filters}
      className={className}
      renderReview={(review: Review) => (
        <ReviewCard review={review} variant={variant} />
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
      renderError={(error) => (
        <div className="text-center py-12 text-error-600">
          <p className="font-medium mb-2">Error loading reviews</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}
    />
  );
}

