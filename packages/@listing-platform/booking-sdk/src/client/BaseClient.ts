import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import type { BookingSDKConfig } from '../config/client';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class BaseClient {
  protected client: AxiosInstance;
  protected config: Required<BookingSDKConfig>;

  constructor(config: BookingSDKConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.example.com',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      headers: config.headers || {},
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        ...this.config.headers,
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response) {
          const data = error.response.data as any;
          throw new ApiError(
            data?.error?.code || 'API_ERROR',
            data?.error?.message || error.message,
            data?.error?.details,
            error.response.status
          );
        }
        throw new ApiError('NETWORK_ERROR', error.message || 'Network error');
      }
    );
  }

  /**
   * Make a GET request with retry logic
   */
  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry(() => this.client.get<T>(url, config));
  }

  /**
   * Make a POST request with retry logic
   */
  protected async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry(() => this.client.post<T>(url, data, config));
  }

  /**
   * Make a PATCH request with retry logic
   */
  protected async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry(() => this.client.patch<T>(url, data, config));
  }

  /**
   * Make a DELETE request with retry logic
   */
  protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry(() => this.client.delete<T>(url, config));
  }

  /**
   * Request with retry logic
   */
  private async requestWithRetry<T>(
    requestFn: () => Promise<{ data: T }>,
    retries = this.config.retries
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i <= retries; i++) {
      try {
        const response = await requestFn();
        return response.data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on 4xx errors (client errors)
        if (error instanceof ApiError && error.statusCode && error.statusCode < 500) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (i < retries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError!;
  }
}

