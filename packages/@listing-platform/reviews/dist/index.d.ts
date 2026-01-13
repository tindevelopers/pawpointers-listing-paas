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
export { initReviewsSDK, getReviewsClient, getReviewsConfig, resetReviewsSDK, ReviewsProvider, useReviewsClient, useReviewsConfig, ReviewsSDK, type ReviewsSDKConfig, type ReviewsProviderProps, } from './sdk';
export type { ApiError, ApiResponse, ReviewSource, ReviewAttribution, ReviewPhoto, Review, ReviewFilters, ReviewFormData, RatingDistribution, SourceStats, ReviewStats, VoteType, VoteResponse, } from './types';
export { normalizeEntityId } from './types';
export * from './hooks';
export * from './components';
export * from './headless';
export * from './api';
export { cn } from './utils/cn';
//# sourceMappingURL=index.d.ts.map