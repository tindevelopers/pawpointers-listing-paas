/**
 * Rating Display Component
 * Shows star rating visually
 */

import React from 'react';
import { cn } from '../utils/cn';

export interface RatingDisplayProps {
  rating: number;
  maxRating?: number;
  showNumber?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RatingDisplay({
  rating,
  maxRating = 5,
  showNumber = false,
  size = 'md',
  className,
}: RatingDisplayProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const stars = Array.from({ length: maxRating }, (_, i) => {
    const starValue = i + 1;
    const filled = starValue <= Math.round(rating);
    const halfFilled = !filled && starValue - 0.5 <= rating;

    return (
      <span key={i} className="inline-block">
        {halfFilled ? (
          <svg
            className={cn(sizeClasses[size], 'text-warning-400')}
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`half-${i}`}>
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#half-${i})`}
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        ) : (
          <svg
            className={cn(
              sizeClasses[size],
              filled ? 'text-warning-400' : 'text-neutral-300'
            )}
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )}
      </span>
    );
  });

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex" aria-label={`Rating: ${rating} out of ${maxRating}`}>
        {stars}
      </div>
      {showNumber && (
        <span className="ml-1 text-sm font-medium text-neutral-700">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}



