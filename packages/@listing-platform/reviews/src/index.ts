/**
 * @listing-platform/reviews
 * Compatibility wrapper for @listing-platform/reviews-sdk
 *
 * Re-exports from the main entry so bundlers (Next.js/Webpack) resolve correctly
 * when using path aliases. New projects should use @listing-platform/reviews-sdk directly.
 *
 * @deprecated Use @listing-platform/reviews-sdk instead
 */

export * from '@listing-platform/reviews-sdk';
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
} from '@listing-platform/reviews-sdk';
