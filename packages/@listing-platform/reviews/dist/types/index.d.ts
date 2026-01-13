/**
 * Types for Reviews SDK
 * Platform-agnostic type definitions
 */
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
/**
 * Source of the review (first-party or external)
 * Extensible with custom string values
 */
export type ReviewSource = 'first_party' | 'google' | 'outscraper' | 'dataforseo' | 'association' | (string & {});
/**
 * Attribution information for external reviews
 */
export interface ReviewAttribution {
    label?: string;
    license?: string;
}
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
    entityId: string;
    /** @deprecated Use entityId instead */
    listingId?: string;
    rating: number;
    title?: string;
    comment?: string;
    photos?: ReviewPhoto[];
    source: ReviewSource;
    sourceType?: string;
    sourceReviewId?: string;
    sourceUrl?: string;
    attribution?: ReviewAttribution;
    authorUserId?: string;
    authorName?: string;
    authorAvatar?: string;
    reviewerType?: 'pet_parent' | 'expert' | 'external';
    expertDomain?: 'vet_medicine' | 'grooming' | 'food' | 'toys';
    expertCredentials?: string;
    isMysteryShopper?: boolean;
    expertRubric?: Record<string, unknown>;
    isVerified?: boolean;
    verificationMethod?: string;
    helpfulCount: number;
    notHelpfulCount?: number;
    ownerResponse?: string;
    ownerResponseAt?: string;
    status: 'pending' | 'approved' | 'rejected' | 'flagged';
    createdAt: string;
    updatedAt: string;
}
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
    reviewerType?: 'pet_parent' | 'expert';
    expertDomain?: 'vet_medicine' | 'grooming' | 'food' | 'toys';
    isMysteryShopper?: boolean;
    expertRubric?: Record<string, unknown>;
}
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
    bySource?: Record<ReviewSource, SourceStats>;
}
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
export declare function normalizeEntityId(entityId?: string, listingId?: string): string;
//# sourceMappingURL=index.d.ts.map