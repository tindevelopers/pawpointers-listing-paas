/**
 * Review Card Component
 * Displays a single review with styling
 */

import React from 'react';
import { ReviewsListHeadless } from '../headless/ReviewsList.headless';
import { RatingDisplay } from './RatingDisplay';
import { cn } from '../utils/cn';
import type { Review } from '../types';

export interface ReviewCardProps {
  review: Review;
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function ReviewCard({ review, variant = 'default', className }: ReviewCardProps) {
  const variants = {
    default: 'bg-white rounded-lg shadow-md p-6 mb-4',
    compact: 'bg-neutral-50 rounded-md shadow-sm p-4 mb-3',
    featured: 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl shadow-lg p-6 mb-4',
  };

  const textColor = variant === 'featured' ? 'text-white' : 'text-neutral-900';
  const textSecondaryColor = variant === 'featured' ? 'text-white/80' : 'text-neutral-500';
  const textMutedColor = variant === 'featured' ? 'text-white/70' : 'text-neutral-500';

  return (
    <div className={cn(variants[variant], className)}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className={cn('text-lg font-semibold', textColor)}>
            {review.authorName || (review.reviewerType === 'expert' ? 'PawPointers Expert' : 'Pet Parent')}
          </h3>
          {review.reviewerType === 'expert' && (review.expertCredentials || review.expertDomain) && (
            <p className={cn('text-sm', textSecondaryColor)}>
              {review.expertCredentials ? review.expertCredentials : null}
              {review.expertCredentials && review.expertDomain ? ' • ' : null}
              {review.expertDomain ? String(review.expertDomain).replace('_', ' ') : null}
              {review.isMysteryShopper ? ' • Mystery shopper' : null}
            </p>
          )}
          <p className={cn('text-sm', textMutedColor)}>
            {formatDate(review.createdAt)}
          </p>
        </div>
        <RatingDisplay
          rating={review.rating}
          size={variant === 'compact' ? 'sm' : 'md'}
          showNumber={variant === 'featured'}
        />
      </div>

      {review.comment && (
        <p className={cn('mb-4', variant === 'featured' ? 'text-white' : 'text-neutral-700')}>
          {review.comment}
        </p>
      )}

      {review.photos && review.photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {review.photos.map((photo) => (
            <img
              key={photo.id}
              src={photo.url}
              alt={photo.alt || 'Review photo'}
              className="rounded-md object-cover h-20 w-full"
            />
          ))}
        </div>
      )}

      <div className={cn('flex items-center gap-4 text-sm', textMutedColor)}>
        <button
          className={cn(
            'hover:opacity-80 transition-opacity',
            variant === 'featured' ? 'text-white' : 'hover:text-primary-600'
          )}
        >
          Helpful ({review.helpfulCount})
        </button>

        {review.ownerResponse && (
          <div className={cn(
            'ml-auto p-3 rounded',
            variant === 'featured' ? 'bg-white/20' : 'bg-neutral-50'
          )}>
            <p className={cn('font-medium mb-1', textColor)}>Owner Response:</p>
            <p className={cn('text-sm', variant === 'featured' ? 'text-white' : 'text-neutral-700')}>
              {review.ownerResponse}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}



