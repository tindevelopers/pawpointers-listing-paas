/**
 * Reviews API Factory
 * Creates configured API client instances
 */

import { ReviewsApiClient, type ReviewsApiConfig } from './client';

let defaultClient: ReviewsApiClient | null = null;

/**
 * Create a new Reviews API client
 */
export function createReviewsApi(config: ReviewsApiConfig): ReviewsApiClient {
  return new ReviewsApiClient(config);
}

/**
 * Get or create the default Reviews API client
 */
export function getReviewsApi(config?: Partial<ReviewsApiConfig>): ReviewsApiClient {
  if (!defaultClient) {
    const baseUrl = config?.baseUrl || 
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    
    defaultClient = new ReviewsApiClient({
      baseUrl,
      ...config,
    });
  }
  
  return defaultClient;
}

/**
 * Set the default Reviews API client
 */
export function setDefaultReviewsApi(client: ReviewsApiClient): void {
  defaultClient = client;
}

