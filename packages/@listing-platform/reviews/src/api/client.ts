/**
 * Reviews API Client
 * Handles all API interactions for reviews
 */

import type { Review, ReviewFilters, ReviewFormData, ReviewStats } from '../types';

export interface ReviewsApiConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  onError?: (error: Error) => void;
}

export interface ReviewsApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface ReviewVote {
  reviewId: string;
  voteType: 'helpful' | 'not_helpful';
}

export class ReviewsApiClient {
  private config: ReviewsApiConfig;
  
  constructor(config: ReviewsApiConfig) {
    this.config = config;
  }
  
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ReviewsApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
          ...options?.headers,
        },
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Request failed: ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.config.onError?.(err);
      throw err;
    }
  }
  
  /**
   * Get reviews for a listing
   */
  async getReviews(
    listingId: string,
    filters?: ReviewFilters
  ): Promise<ReviewsApiResponse<Review[]>> {
    const params = new URLSearchParams();
    params.set('listingId', listingId);
    
    if (filters?.minRating) params.set('minRating', String(filters.minRating));
    if (filters?.maxRating) params.set('maxRating', String(filters.maxRating));
    if (filters?.hasPhotos !== undefined) params.set('hasPhotos', String(filters.hasPhotos));
    if (filters?.hasComments !== undefined) params.set('hasComments', String(filters.hasComments));
    if (filters?.sortBy) params.set('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    
    return this.request<Review[]>(`/api/reviews?${params}`);
  }
  
  /**
   * Get a single review by ID
   */
  async getReview(reviewId: string): Promise<ReviewsApiResponse<Review>> {
    return this.request<Review>(`/api/reviews/${reviewId}`);
  }
  
  /**
   * Get review statistics for a listing
   */
  async getReviewStats(listingId: string): Promise<ReviewsApiResponse<ReviewStats>> {
    return this.request<ReviewStats>(`/api/reviews/stats/${listingId}`);
  }
  
  /**
   * Submit a new review
   */
  async createReview(
    data: ReviewFormData
  ): Promise<ReviewsApiResponse<Review>> {
    const formData = new FormData();
    formData.append('listingId', data.listingId);
    formData.append('rating', String(data.rating));
    
    if (data.comment) {
      formData.append('comment', data.comment);
    }
    
    if (data.photos) {
      data.photos.forEach((file, index) => {
        formData.append(`photos[${index}]`, file);
      });
    }
    
    const response = await fetch(`${this.config.baseUrl}/api/reviews`, {
      method: 'POST',
      headers: {
        ...this.config.headers,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to submit review');
    }
    
    return response.json();
  }
  
  /**
   * Update an existing review
   */
  async updateReview(
    reviewId: string,
    data: Partial<ReviewFormData>
  ): Promise<ReviewsApiResponse<Review>> {
    return this.request<Review>(`/api/reviews/${reviewId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
  
  /**
   * Delete a review
   */
  async deleteReview(reviewId: string): Promise<void> {
    await this.request(`/api/reviews/${reviewId}`, {
      method: 'DELETE',
    });
  }
  
  /**
   * Vote on a review (helpful/not helpful)
   */
  async voteOnReview(
    reviewId: string,
    voteType: 'helpful' | 'not_helpful'
  ): Promise<ReviewsApiResponse<{ helpfulCount: number; notHelpfulCount: number }>> {
    return this.request(`/api/reviews/${reviewId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ voteType }),
    });
  }
  
  /**
   * Remove vote from a review
   */
  async removeVote(reviewId: string): Promise<void> {
    await this.request(`/api/reviews/${reviewId}/vote`, {
      method: 'DELETE',
    });
  }
  
  /**
   * Report a review for moderation
   */
  async reportReview(
    reviewId: string,
    reason: string
  ): Promise<ReviewsApiResponse<{ reported: boolean }>> {
    return this.request(`/api/reviews/${reviewId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }
  
  /**
   * Add owner response to a review
   */
  async addOwnerResponse(
    reviewId: string,
    response: string
  ): Promise<ReviewsApiResponse<Review>> {
    return this.request(`/api/reviews/${reviewId}/response`, {
      method: 'POST',
      body: JSON.stringify({ response }),
    });
  }
  
  // Admin/Moderation methods
  
  /**
   * Get pending reviews for moderation
   */
  async getPendingReviews(
    options?: { page?: number; limit?: number }
  ): Promise<ReviewsApiResponse<Review[]>> {
    const params = new URLSearchParams();
    params.set('status', 'pending');
    if (options?.page) params.set('page', String(options.page));
    if (options?.limit) params.set('limit', String(options.limit));
    
    return this.request<Review[]>(`/api/admin/reviews?${params}`);
  }
  
  /**
   * Approve a review
   */
  async approveReview(reviewId: string): Promise<ReviewsApiResponse<Review>> {
    return this.request(`/api/admin/reviews/${reviewId}/approve`, {
      method: 'POST',
    });
  }
  
  /**
   * Reject a review
   */
  async rejectReview(
    reviewId: string,
    reason?: string
  ): Promise<ReviewsApiResponse<Review>> {
    return this.request(`/api/admin/reviews/${reviewId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }
  
  /**
   * Flag a review for further review
   */
  async flagReview(
    reviewId: string,
    notes?: string
  ): Promise<ReviewsApiResponse<Review>> {
    return this.request(`/api/admin/reviews/${reviewId}/flag`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }
}

