/**
 * @listing-platform/reviews
 * Reviews and Ratings SDK
 * 
 * Features:
 * - Review display components (styled and headless)
 * - Review form with rating
 * - Review statistics
 * - Voting (helpful/not helpful)
 * - API client with adapter pattern
 * - External review support (Google, Outscraper, etc.)
 * - SDK initialization and React Context
 */

// Export SDK initialization and context
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
} from './sdk';

// Export types (explicit to avoid conflicts)
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
} from './types';
export { normalizeEntityId } from './types';

// Export hooks
export * from './hooks';

// Export styled components
export * from './components';

// Export headless components
export * from './headless';

// Export API client
export * from './api';

// Export utilities
export { cn } from './utils/cn';
