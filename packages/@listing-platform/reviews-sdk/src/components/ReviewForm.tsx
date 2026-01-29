/**
 * Styled Review Form Component
 * Uses headless component with pre-styled UI
 */

import React, { useState, useEffect } from 'react';
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
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = (hoveredRating > 0 && hoveredRating >= star) || (value as number) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => onChange(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className={cn(
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition-transform hover:scale-110',
                        isFilled && 'transform scale-105'
                      )}
                      aria-label={`Rate ${star} stars`}
                    >
                      <svg
                        className={cn(
                          'w-8 h-8 transition-all duration-200',
                          isFilled
                            ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm'
                            : 'text-gray-300 fill-gray-300'
                        )}
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  );
                })}
              </div>
              {value && (value as number) > 0 && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {(value as number) === 5 && 'Excellent!'}
                  {(value as number) === 4 && 'Great!'}
                  {(value as number) === 3 && 'Good'}
                  {(value as number) === 2 && 'Fair'}
                  {(value as number) === 1 && 'Poor'}
                </p>
              )}
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
            'px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg',
            'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors shadow-sm',
            'mt-4'
          )}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </button>
      )}
      renderCancel={({ onCancel }) => (
        onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg',
              'hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
              'transition-colors shadow-sm',
              'mt-4 ml-3'
            )}
          >
            Cancel
          </button>
        ) : null
      )}
      renderError={(error: ApiError) => (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error.message}</p>
        </div>
      )}
      renderSuccess={(message: string) => (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">{message}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Your review will be visible after moderation. You can edit it anytime from your account.
              </p>
            </div>
          </div>
        </div>
      )}
    />
  );
}
