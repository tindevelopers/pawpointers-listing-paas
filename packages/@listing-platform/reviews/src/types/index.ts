/**
 * Types for Reviews SDK
 * Platform-agnostic type definitions
 */

// ============================================
// API Response Types
// ============================================

/**
 * Standardized API error format
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Standardized API response envelope
 */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    offset?: number;
    nextCursor?: string | null;
  };
  error?: ApiError;
}

// ============================================
// Review Source / Provenance Types
// ============================================

/**
 * Source of the review (first-party or external)
 * Extensible with custom string values
 */
export type ReviewSource =
  | 'first_party'
  | 'google'
  | 'outscraper'
  | 'dataforseo'
  | 'association'
  | (string & {});

/**
 * Attribution information for external reviews
 */
export interface ReviewAttribution {
  label?: string;
  license?: string;
}

// ============================================
// Core Review Types
// ============================================

/**
 * Photo attached to a review
 */
export interface ReviewPhoto {
  id?: string;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  displayOrder?: number;
}

/**
 * Core Review type
 * Uses entityId as primary identifier (platform-agnostic)
 */
export interface Review {
  id: string;

  // Primary identifier (platform-agnostic)
  entityId: string;
  /** @deprecated Use entityId instead */
  listingId?: string;

  // Review content
  rating: number; // 1-5
  comment?: string;
  photos?: ReviewPhoto[];

  // Provenance (for external reviews)
  source: ReviewSource;
  sourceType?: string; // e.g., 'googleMaps', 'associationHotelGroup'
  sourceReviewId?: string;
  sourceUrl?: string;
  attribution?: ReviewAttribution;

  // Author information
  authorUserId?: string;
  authorName?: string;
  authorAvatar?: string;

  // Reviewer type (Pet Parent vs PawPointers Expert)
  reviewerType?: 'pet_parent' | 'expert' | 'external';
  expertDomain?: 'vet_medicine' | 'grooming' | 'food' | 'toys';
  expertCredentials?: string;
  isMysteryShopper?: boolean;
  expertRubric?: Record<string, unknown>;

  // Trust signals
  isVerified?: boolean;
  verificationMethod?: string;

  // Engagement
  helpfulCount: number;
  notHelpfulCount?: number;

  // Owner response
  ownerResponse?: string;
  ownerResponseAt?: string;

  // Moderation
  status: 'pending' | 'approved' | 'rejected' | 'flagged';

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Filter Types
// ============================================

/**
 * Filters for querying reviews
 */
export interface ReviewFilters {
  minRating?: number;
  maxRating?: number;
  hasPhotos?: boolean;
  hasComments?: boolean;
  source?: ReviewSource | 'all';
  sourceType?: string;
  sortBy?: 'date' | 'rating' | 'helpful';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// ============================================
// Form Types
// ============================================

/**
 * Data for submitting a new review
 */
export interface ReviewFormData {
  entityId: string;
  /** @deprecated Use entityId instead */
  listingId?: string;
  rating: number;
  comment?: string;
  photos?: File[];

  // Optional: expert submission (typically from admin tooling)
  reviewerType?: 'pet_parent' | 'expert';
  expertDomain?: 'vet_medicine' | 'grooming' | 'food' | 'toys';
  isMysteryShopper?: boolean;
  expertRubric?: Record<string, unknown>;
}

// ============================================
// Statistics Types
// ============================================

/**
 * Rating distribution by star count
 */
export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

/**
 * Statistics breakdown by source
 */
export interface SourceStats {
  total: number;
  averageRating: number;
}

/**
 * Review statistics for an entity
 */
export interface ReviewStats {
  total: number;
  averageRating: number;
  ratingDistribution: RatingDistribution;
  // Optional breakdown by source (for hybrid systems)
  bySource?: Record<ReviewSource, SourceStats>;
}

// ============================================
// Vote Types
// ============================================

/**
 * Vote type for review helpfulness
 */
export type VoteType = 'helpful' | 'not_helpful';

/**
 * Vote response from API
 */
export interface VoteResponse {
  helpfulCount: number;
  notHelpfulCount: number;
}

// ============================================
// Legacy Aliases (for backward compatibility)
// ============================================

// Helper function to normalize entityId/listingId
export function normalizeEntityId(
  entityId?: string,
  listingId?: string
): string {
  const id = entityId || listingId;
  if (!id) {
    throw new Error('Either entityId or listingId must be provided');
  }
  return id;
}
