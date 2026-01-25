/**
 * @listing-platform/reviews
 * Compatibility wrapper for @listing-platform/reviews-sdk
 * 
 * This package now re-exports everything from @listing-platform/reviews-sdk
 * to maintain backward compatibility. New projects should use @listing-platform/reviews-sdk directly.
 * 
 * @deprecated Use @listing-platform/reviews-sdk instead
 */

// Re-export SDK initialization and context
export {
  initReviewsSDK,
  getReviewsClient,
  getReviewsConfig,
  resetReviewsSDK,
  ReviewsProvider,
  useReviewsClient,
  useReviewsConfig,
  ReviewsSDK,
  type ReviewsSDKConfig,
  type ReviewsProviderProps,
} from '@listing-platform/reviews-sdk/sdk';

// Re-export types
export type {
  ApiError,
  ApiResponse,
  ReviewSource,
  ReviewAttribution,
  ReviewPhoto,
  Review,
  ReviewFilters,
  ReviewFormData,
  RatingDistribution,
  SourceStats,
  ReviewStats,
  VoteType,
  VoteResponse,
} from '@listing-platform/reviews-sdk/types';
export { normalizeEntityId } from '@listing-platform/reviews-sdk/types';

// Re-export hooks
export * from '@listing-platform/reviews-sdk/hooks';

// Re-export styled components
export * from '@listing-platform/reviews-sdk/components';

// Re-export headless components
export * from '@listing-platform/reviews-sdk/headless';

// Re-export API client
export * from '@listing-platform/reviews-sdk/api';

// Re-export utilities
export { cn } from '@listing-platform/reviews-sdk/utils/cn';
