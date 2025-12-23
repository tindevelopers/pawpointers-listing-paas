/**
 * Maps API Client
 * Handles all API interactions for maps and location features
 */

import type { 
  Coordinates, 
  NearbyPlace, 
  ServiceArea, 
  Neighborhood,
  NearbyListing 
} from '../types';

export interface MapsApiConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  onError?: (error: Error) => void;
}

export interface MapsApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export class MapsApiClient {
  private config: MapsApiConfig;
  
  constructor(config: MapsApiConfig) {
    this.config = config;
  }
  
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<MapsApiResponse<T>> {
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
   * Get nearby listings based on coordinates
   */
  async getNearbyListings(
    location: Coordinates,
    options?: {
      radiusKm?: number;
      limit?: number;
      category?: string;
      minRating?: number;
    }
  ): Promise<MapsApiResponse<NearbyListing[]>> {
    const params = new URLSearchParams({
      lat: String(location.lat),
      lng: String(location.lng),
      radiusKm: String(options?.radiusKm || 10),
      limit: String(options?.limit || 20),
    });
    
    if (options?.category) params.set('category', options.category);
    if (options?.minRating !== undefined) params.set('minRating', String(options.minRating));
    
    return this.request<NearbyListing[]>(`/api/listings/nearby?${params}`);
  }
  
  /**
   * Get nearby places for a listing
   */
  async getNearbyPlaces(
    listingId: string,
    options?: {
      types?: string[];
      limit?: number;
    }
  ): Promise<MapsApiResponse<NearbyPlace[]>> {
    const params = new URLSearchParams();
    if (options?.types) params.set('types', options.types.join(','));
    if (options?.limit) params.set('limit', String(options.limit));
    
    return this.request<NearbyPlace[]>(`/api/listings/${listingId}/nearby-places?${params}`);
  }
  
  /**
   * Get service areas for a listing
   */
  async getServiceAreas(listingId: string): Promise<MapsApiResponse<ServiceArea[]>> {
    return this.request<ServiceArea[]>(`/api/listings/${listingId}/service-areas`);
  }
  
  /**
   * Update service areas for a listing
   */
  async updateServiceAreas(
    listingId: string,
    areas: Partial<ServiceArea>[]
  ): Promise<MapsApiResponse<ServiceArea[]>> {
    return this.request<ServiceArea[]>(`/api/listings/${listingId}/service-areas`, {
      method: 'PUT',
      body: JSON.stringify({ areas }),
    });
  }
  
  /**
   * Check if a listing serves a location
   */
  async checkServiceArea(
    listingId: string,
    location: Coordinates
  ): Promise<MapsApiResponse<{ serves: boolean }>> {
    const params = new URLSearchParams({
      lat: String(location.lat),
      lng: String(location.lng),
    });
    
    return this.request<{ serves: boolean }>(
      `/api/listings/${listingId}/serves-location?${params}`
    );
  }
  
  /**
   * Get neighborhood information
   */
  async getNeighborhood(slug: string): Promise<MapsApiResponse<Neighborhood>> {
    return this.request<Neighborhood>(`/api/neighborhoods/${slug}`);
  }
  
  /**
   * Get neighborhoods near a location
   */
  async getNearbyNeighborhoods(
    location: Coordinates,
    options?: { limit?: number }
  ): Promise<MapsApiResponse<Neighborhood[]>> {
    const params = new URLSearchParams({
      lat: String(location.lat),
      lng: String(location.lng),
      limit: String(options?.limit || 5),
    });
    
    return this.request<Neighborhood[]>(`/api/neighborhoods/nearby?${params}`);
  }
  
  /**
   * Get listings in a neighborhood
   */
  async getNeighborhoodListings(
    neighborhoodSlug: string,
    options?: { page?: number; limit?: number }
  ): Promise<MapsApiResponse<{ listings: NearbyListing[]; total: number }>> {
    const params = new URLSearchParams();
    if (options?.page) params.set('page', String(options.page));
    if (options?.limit) params.set('limit', String(options.limit));
    
    return this.request<{ listings: NearbyListing[]; total: number }>(
      `/api/neighborhoods/${neighborhoodSlug}/listings?${params}`
    );
  }
  
  /**
   * Update listing location
   */
  async updateListingLocation(
    listingId: string,
    location: Coordinates & { address?: string }
  ): Promise<MapsApiResponse<{ updated: boolean }>> {
    return this.request<{ updated: boolean }>(`/api/listings/${listingId}/location`, {
      method: 'PATCH',
      body: JSON.stringify(location),
    });
  }
}

