/**
 * Reviews API Factory
 * Factory functions for creating and managing API client instances
 * 
 * @deprecated Prefer using the SDK initialization pattern:
 * import { initReviewsSDK, ReviewsProvider } from '@listing-platform/reviews';
 */

import { ReviewsApiClient, type ReviewsApiConfig, type IReviewsApiClient } from './client';
import { getReviewsClient, initReviewsSDK, resetReviewsSDK } from '../sdk';

/**
 * Create a new Reviews API client instance
 */
export function createReviewsApi(config: ReviewsApiConfig): IReviewsApiClient {
  return new ReviewsApiClient(config);
}

/**
 * Get the default Reviews API client instance
 * Creates one if it doesn't exist
 * 
 * @deprecated Use getReviewsClient() from sdk.ts instead
 */
export function getReviewsApi(config?: Partial<ReviewsApiConfig>): IReviewsApiClient {
  try {
    return getReviewsClient();
  } catch {
    // Auto-initialize if not already done
    const baseUrl = config?.baseUrl || 
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    
    return initReviewsSDK({
      baseUrl,
      headers: config?.headers,
      fetchFn: config?.fetchFn,
    });
  }
}

/**
 * Set the default Reviews API client
 * 
 * @deprecated Use initReviewsSDK() from sdk.ts instead
 */
export function setDefaultReviewsApi(client: IReviewsApiClient): void {
  // Re-initialize SDK with custom adapter
  initReviewsSDK({
    baseUrl: '',
    adapter: client,
  });
}

/**
 * Reset the default Reviews API client
 * 
 * @deprecated Use resetReviewsSDK() from sdk.ts instead
 */
export function resetDefaultReviewsApi(): void {
  resetReviewsSDK();
}

// Re-export for backward compatibility
export { ReviewsApiClient, type ReviewsApiConfig, type IReviewsApiClient };
