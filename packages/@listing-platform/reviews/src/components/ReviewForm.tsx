/**
 * Styled Review Form Component
 * Uses headless component with pre-styled UI
 */

import React, { useState } from 'react';
import { ReviewFormHeadless } from '../headless/ReviewForm.headless';
import { RatingDisplay } from './RatingDisplay';
import { cn } from '../utils/cn';
import type { ApiError } from '../types';

export interface ReviewFormProps {
  /** Entity ID for the review */
  entityId: string;
  /** @deprecated Use entityId instead */
  listingId?: string;
  onSubmit?: (reviewId: string) => void;
  onCancel?: () => void;
  variant?: 'default' | 'compact';
  className?: string;
}

export function ReviewForm({
  entityId,
  listingId,
  onSubmit,
  onCancel,
  variant = 'default',
  className,
}: ReviewFormProps) {
  // Use entityId, fall back to listingId for backward compatibility
  const resolvedEntityId = entityId || listingId || '';
  
  const [hoveredRating, setHoveredRating] = useState<number>(0);

  return (
    <ReviewFormHeadless
      entityId={resolvedEntityId}
      onSubmit={onSubmit}
      onCancel={onCancel}
      className={cn('space-y-4', className)}
      renderField={({ name, label, type, value, onChange, error }) => {
        if (type === 'rating') {
          return (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                {label} {error && <span className="text-error-600">*</span>}
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => onChange(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                    aria-label={`Rate ${star} stars`}
                  >
                    <svg
                      className={cn(
                        'w-6 h-6 transition-colors',
                        (hoveredRating >= star || (value as number) >= star)
                          ? 'text-warning-400'
                          : 'text-neutral-300'
                      )}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
              {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
            </div>
          );
        }

        if (type === 'textarea') {
          return (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                {label}
              </label>
              <textarea
                value={value as string}
                onChange={(e) => onChange(e.target.value)}
                rows={4}
                className={cn(
                  'w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                  error && 'border-error-500 focus:ring-error-500'
                )}
                placeholder="Share your experience..."
              />
              {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
            </div>
          );
        }

        if (type === 'file') {
          return (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                {label}
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  onChange(files);
                }}
                className={cn(
                  'w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                  error && 'border-error-500 focus:ring-error-500'
                )}
              />
              {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
            </div>
          );
        }

        return null;
      }}
      renderSubmit={({ isSubmitting, onSubmit }) => (
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className={cn(
            'px-4 py-2 bg-primary-600 text-white rounded-md',
            'hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors'
          )}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </button>
      )}
      renderCancel={({ onCancel }) => (
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            'px-4 py-2 bg-neutral-200 text-neutral-700 rounded-md',
            'hover:bg-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-500',
            'transition-colors'
          )}
        >
          Cancel
        </button>
      )}
      renderError={(error: ApiError) => (
        <div className="p-3 bg-error-50 border border-error-200 rounded-md">
          <p className="text-sm text-error-600">{error.message}</p>
        </div>
      )}
    />
  );
}
