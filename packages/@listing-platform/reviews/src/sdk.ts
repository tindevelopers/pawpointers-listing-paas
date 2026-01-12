/**
 * Reviews SDK
 * Main entry point for SDK initialization and configuration
 */

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { ReviewsApiClient, type ReviewsApiConfig, type IReviewsApiClient } from './api/client';

// ============================================
// SDK Configuration Types
// ============================================

export interface ReviewsSDKConfig {
  /** Base URL for API requests */
  baseUrl: string;
  /** Default headers for API requests */
  headers?: Record<string, string>;
  /** Custom API client implementation (adapter pattern) */
  adapter?: IReviewsApiClient;
  /** Custom fetch implementation */
  fetchFn?: typeof fetch;
}

// ============================================
// SDK Singleton Instance
// ============================================

let defaultClient: IReviewsApiClient | null = null;
let defaultConfig: ReviewsSDKConfig | null = null;

/**
 * Initialize the Reviews SDK
 * Call this once at app startup
 */
export function initReviewsSDK(config: ReviewsSDKConfig): IReviewsApiClient {
  defaultConfig = config;

  // Use custom adapter if provided
  if (config.adapter) {
    defaultClient = config.adapter;
    return defaultClient;
  }

  // Create default client
  const clientConfig: ReviewsApiConfig = {
    baseUrl: config.baseUrl,
    headers: config.headers,
    fetchFn: config.fetchFn,
  };

  defaultClient = new ReviewsApiClient(clientConfig);
  return defaultClient;
}

/**
 * Get the default SDK client
 * Throws if SDK not initialized
 */
export function getReviewsClient(): IReviewsApiClient {
  if (!defaultClient) {
    // Auto-initialize with defaults in browser environment
    if (typeof window !== 'undefined') {
      return initReviewsSDK({
        baseUrl: window.location.origin,
      });
    }
    throw new Error(
      'Reviews SDK not initialized. Call initReviewsSDK() first, or wrap your app with <ReviewsProvider>.'
    );
  }
  return defaultClient;
}

/**
 * Get the current SDK configuration
 */
export function getReviewsConfig(): ReviewsSDKConfig | null {
  return defaultConfig;
}

/**
 * Reset the SDK (useful for testing)
 */
export function resetReviewsSDK(): void {
  defaultClient = null;
  defaultConfig = null;
}

// ============================================
// React Context
// ============================================

interface ReviewsContextValue {
  client: IReviewsApiClient;
  config: ReviewsSDKConfig;
}

const ReviewsContext = createContext<ReviewsContextValue | null>(null);

export interface ReviewsProviderProps {
  children: ReactNode;
  config?: ReviewsSDKConfig;
  /** Alternative: provide a pre-configured client */
  client?: IReviewsApiClient;
}

/**
 * Reviews SDK Provider
 * Wrap your app with this to provide SDK context to hooks
 */
export function ReviewsProvider({
  children,
  config,
  client: customClient,
}: ReviewsProviderProps): React.ReactElement {
  const value = useMemo<ReviewsContextValue>(() => {
    // Use custom client if provided
    if (customClient) {
      return {
        client: customClient,
        config: config || { baseUrl: '' },
      };
    }

    // Use provided config or create default
    const resolvedConfig: ReviewsSDKConfig = config || {
      baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
    };

    // Initialize or get existing client
    const client = initReviewsSDK(resolvedConfig);

    return { client, config: resolvedConfig };
  }, [config, customClient]);

  return React.createElement(ReviewsContext.Provider, { value }, children);
}

/**
 * Hook to access the Reviews SDK client
 * Must be used within a ReviewsProvider
 */
export function useReviewsClient(): IReviewsApiClient {
  const context = useContext(ReviewsContext);

  // If no context, try to use global client
  if (!context) {
    return getReviewsClient();
  }

  return context.client;
}

/**
 * Hook to access the Reviews SDK configuration
 */
export function useReviewsConfig(): ReviewsSDKConfig | null {
  const context = useContext(ReviewsContext);
  return context?.config || defaultConfig;
}

// ============================================
// Static SDK Object (alternative API)
// ============================================

/**
 * Static SDK object for imperative initialization
 * @example
 * ReviewsSDK.init({ baseUrl: '/api' });
 * const reviews = await ReviewsSDK.getClient().getReviews('entity-123');
 */
export const ReviewsSDK = {
  init: initReviewsSDK,
  getClient: getReviewsClient,
  getConfig: getReviewsConfig,
  reset: resetReviewsSDK,
} as const;

