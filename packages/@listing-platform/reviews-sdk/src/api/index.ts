/**
 * Reviews API Client
 */

export {
  ReviewsApiClient,
  type ReviewsApiConfig,
  type IReviewsApiClient,
} from './client';

export {
  createReviewsApi,
  getReviewsApi,
  setDefaultReviewsApi,
  resetDefaultReviewsApi,
} from './factory';
