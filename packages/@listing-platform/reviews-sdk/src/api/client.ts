/**
 * Reviews API Client
 * Platform-agnostic API client for Reviews SDK
 */

import type {
  Review,
  ReviewFilters,
  ReviewFormData,
  ReviewStats,
  ApiResponse,
  ApiError,
  VoteType,
  VoteResponse,
  normalizeEntityId,
} from '../types';
import { normalizeEntityId as normalizeId } from '../types';

// ============================================
// Configuration Types
// ============================================

export interface ReviewsApiConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  /** Custom fetch implementation (for testing or adapters) */
  fetchFn?: typeof fetch;
}

// ============================================
// API Client Interface (Adapter Pattern)
// ============================================

/**
 * Interface for Reviews API Client
 * Implement this to create custom adapters
 */
export interface IReviewsApiClient {
  // Read operations
  getReviews(
    entityId: string,
    filters?: ReviewFilters,
    signal?: AbortSignal
  ): Promise<ApiResponse<Review[]>>;

  getReviewById(
    reviewId: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<Review>>;

  getStats(
    entityId: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<ReviewStats>>;

  // Write operations
  createReview(data: ReviewFormData): Promise<ApiResponse<Review>>;

  vote(
    reviewId: string,
    type: VoteType,
    signal?: AbortSignal
  ): Promise<ApiResponse<VoteResponse>>;

  // Admin operations (optional)
  updateReviewStatus?(
    reviewId: string,
    status: Review['status'],
    signal?: AbortSignal
  ): Promise<ApiResponse<Review>>;

  addOwnerResponse?(
    reviewId: string,
    response: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<Review>>;
}

// ============================================
// Default API Client Implementation
// ============================================

export class ReviewsApiClient implements IReviewsApiClient {
  private config: ReviewsApiConfig;
  private fetchFn: typeof fetch;

  constructor(config: ReviewsApiConfig) {
    this.config = config;
    // Bind fetch to window to avoid "Illegal invocation" error
    this.fetchFn = config.fetchFn || (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
  }

  /**
   * Core request method with standardized error handling
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const response = await this.fetchFn(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
        ...options?.headers,
      },
    });

    const json = await response.json();

    // If response follows the ApiResponse envelope, return as-is
    if ('data' in json || 'error' in json) {
      // Standardize response structure
      if (!response.ok && !json.error) {
        return {
          data: json.data ?? null,
          error: {
            code: `HTTP_${response.status}`,
            message: json.message || response.statusText,
          },
        } as ApiResponse<T>;
      }
      return json as ApiResponse<T>;
    }

    // Legacy response format: wrap in envelope
    if (!response.ok) {
      return {
        data: null as T,
        error: {
          code: `HTTP_${response.status}`,
          message: json.message || json.error || response.statusText,
        },
      };
    }

    // Wrap legacy successful response
    return {
      data: json as T,
    };
  }

  /**
   * Get reviews for an entity
   */
  async getReviews(
    entityId: string,
    filters?: ReviewFilters,
    signal?: AbortSignal
  ): Promise<ApiResponse<Review[]>> {
    const params = new URLSearchParams();
    params.set('entityId', entityId);
    // Support legacy API that might use listingId
    params.set('listingId', entityId);

    if (filters) {
      if (filters.minRating) params.set('minRating', String(filters.minRating));
      if (filters.maxRating) params.set('maxRating', String(filters.maxRating));
      if (filters.hasPhotos !== undefined)
        params.set('hasPhotos', String(filters.hasPhotos));
      if (filters.hasComments !== undefined)
        params.set('hasComments', String(filters.hasComments));
      if (filters.source && filters.source !== 'all')
        params.set('source', filters.source);
      if (filters.sourceType) params.set('sourceType', filters.sourceType);
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.offset) params.set('offset', String(filters.offset));
    }

    const response = await this.request<Review[]>(`/api/reviews?${params}`, {
      signal,
    });

    // Handle legacy response format: { reviews: Review[] }
    if (response.data && 'reviews' in (response.data as any)) {
      return {
        ...response,
        data: (response.data as any).reviews,
      };
    }

    return response;
  }

  /**
   * Get a single review by ID
   */
  async getReviewById(
    reviewId: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<Review>> {
    return this.request<Review>(`/api/reviews/${reviewId}`, { signal });
  }

  /**
   * Get review statistics for an entity
   */
  async getStats(
    entityId: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<ReviewStats>> {
    const params = new URLSearchParams();
    params.set('entityId', entityId);
    // Support legacy API
    params.set('listingId', entityId);

    const response = await this.request<ReviewStats>(
      `/api/reviews/stats?${params}`,
      { signal }
    );

    // Handle legacy response format: { stats: ReviewStats }
    if (response.data && 'stats' in (response.data as any)) {
      return {
        ...response,
        data: (response.data as any).stats,
      };
    }

    return response;
  }

  /**
   * Create a new review
   */
  async createReview(data: ReviewFormData): Promise<ApiResponse<Review>> {
    console.log('[ReviewsApiClient] createReview called with:', data);
    // Use entityId, fall back to listingId for legacy compatibility
    const entityId = normalizeId(data.entityId, data.listingId);
    console.log('[ReviewsApiClient] Normalized entityId:', entityId);

    // Handle file uploads with FormData
    if (data.photos && data.photos.length > 0) {
      console.log('[ReviewsApiClient] Using FormData for photo uploads');
      const formData = new FormData();
      formData.append('entityId', entityId);
      formData.append('listingId', entityId); // Legacy support
      formData.append('rating', String(data.rating));
      if (data.comment) formData.append('comment', data.comment);
      data.photos.forEach((photo, index) => {
        formData.append(`photos[${index}]`, photo);
      });

      const url = `${this.config.baseUrl}/api/reviews`;
      console.log('[ReviewsApiClient] POSTing to:', url);
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          ...this.config.headers,
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: formData,
      });

      console.log('[ReviewsApiClient] Response status:', response.status, response.statusText);
      const json = await response.json();
      console.log('[ReviewsApiClient] Response JSON:', json);

      if ('data' in json || 'error' in json) {
        return json as ApiResponse<Review>;
      }

      if (!response.ok) {
        return {
          data: null as unknown as Review,
          error: {
            code: `HTTP_${response.status}`,
            message: json.message || json.error || response.statusText,
          },
        };
      }

      return { data: json };
    }

    // JSON request for reviews without photos
    const requestBody = {
      entityId,
      listingId: entityId, // Legacy support
      rating: data.rating,
      comment: data.comment,
    };
    console.log('[ReviewsApiClient] Using JSON request:', requestBody);
    return this.request<Review>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * Vote on a review's helpfulness
   */
  async vote(
    reviewId: string,
    type: VoteType,
    signal?: AbortSignal
  ): Promise<ApiResponse<VoteResponse>> {
    return this.request<VoteResponse>(`/api/reviews/${reviewId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ type }),
      signal,
    });
  }

  /**
   * Update review status (admin)
   */
  async updateReviewStatus(
    reviewId: string,
    status: Review['status'],
    signal?: AbortSignal
  ): Promise<ApiResponse<Review>> {
    return this.request<Review>(`/api/reviews/${reviewId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      signal,
    });
  }

  /**
   * Add owner response to a review (admin)
   */
  async addOwnerResponse(
    reviewId: string,
    response: string,
    signal?: AbortSignal
  ): Promise<ApiResponse<Review>> {
    return this.request<Review>(`/api/reviews/${reviewId}/response`, {
      method: 'POST',
      body: JSON.stringify({ response }),
      signal,
    });
  }
}
