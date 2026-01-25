/**
 * Review Statistics Component
 * Displays overall rating and distribution
 */

import React from 'react';
import { cn } from '../utils/cn';
import { RatingDisplay } from './RatingDisplay';
import type { ReviewStats as ReviewStatsType } from '../types';

export interface ReviewStatsDisplayProps {
  stats: ReviewStatsType;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export function ReviewStatsDisplay({
  stats,
  variant = 'default',
  className,
}: ReviewStatsDisplayProps) {
  const { averageRating, total, ratingDistribution } = stats;
  
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <RatingDisplay rating={averageRating} showNumber size="md" />
        <span className="text-sm text-neutral-500">
          ({total} {total === 1 ? 'review' : 'reviews'})
        </span>
      </div>
    );
  }
  
  const maxCount = Math.max(...Object.values(ratingDistribution));
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Rating */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-4xl font-bold text-neutral-900">
            {averageRating.toFixed(1)}
          </div>
          <RatingDisplay rating={averageRating} size="lg" className="mt-1" />
          <div className="text-sm text-neutral-500 mt-1">
            {total} {total === 1 ? 'review' : 'reviews'}
          </div>
        </div>
        
        {variant === 'detailed' && (
          <div className="flex-1 space-y-2">
            {/* Rating Distribution */}
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star as keyof typeof ratingDistribution];
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
              
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-sm text-neutral-600 w-3">{star}</span>
                  <svg
                    className="w-4 h-4 text-warning-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-warning-400 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-neutral-500 w-8 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Export props type with legacy name for backward compatibility
export type { ReviewStatsDisplayProps as ReviewStatsProps };
