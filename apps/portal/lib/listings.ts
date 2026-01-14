/**
 * Listing Data Fetching Helpers
 *
 * CUSTOMIZE: Update these functions to match your listing type and API endpoints
 *
 * This file provides data fetching utilities for the portal.
 * It abstracts the API calls and provides typed responses.
 */

// CUSTOMIZE: Import your listing config for type-specific settings
// import { listingConfig } from '@/config/listing.config';

// CUSTOMIZE: Define your listing type to match your vertical
export interface Listing {
  id: string;
  slug: string;
  title: string;
  description: string;
  price?: number;
  images: string[];
  category?: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  status: 'active' | 'pending' | 'sold' | 'archived';
  createdAt: string;
  updatedAt: string;
  // CUSTOMIZE: Add custom fields for your vertical
  // For real estate: bedrooms, bathrooms, sqft, yearBuilt
  // For services: hourlyRate, availability, serviceArea
  // For directory: businessHours, phone, website
  customFields?: Record<string, unknown>;
}

export interface ListingSearchParams {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'date' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

export interface ListingSearchResult {
  listings: Listing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const urlStatus = SUPABASE_URL ? 'SET' : 'MISSING';
  const keyStatus = SUPABASE_ANON_KEY ? 'SET' : 'MISSING';
  
  throw new Error(
    `Missing Supabase environment variables in apps/portal. ` +
    `NEXT_PUBLIC_SUPABASE_URL: ${urlStatus}, ` +
    `NEXT_PUBLIC_SUPABASE_ANON_KEY: ${keyStatus}. ` +
    `Please create apps/portal/.env.local with these variables and restart the dev server.`
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Fetch a single listing by slug
 * Uses the public API endpoint (no auth required)
 */
export async function getListingBySlug(slug: string): Promise<Listing | null> {
  try {
    const { data, error } = await supabase
      .from('public_listings_view')
      .select('id, slug, title, description, price, images, category, location, status, created_at, updated_at')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch listing by slug:', error.message);
      return null;
    }

    return data
      ? {
          id: data.id,
          slug: data.slug,
          title: data.title,
          description: data.description,
          price: data.price,
          images: data.images || [],
          category: data.category,
          location: data.location,
          status: data.status,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        }
      : null;
  } catch (error) {
    console.error('Error fetching listing:', error);
    return null;
  }
}

/**
 * Fetch a single listing by ID
 * Uses the public API endpoint (no auth required)
 */
export async function getListingById(id: string): Promise<Listing | null> {
  try {
    const { data, error } = await supabase
      .from('public_listings_view')
      .select('id, slug, title, description, price, images, category, location, status, created_at, updated_at')
      .eq('id', id)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch listing by id:', error.message);
      return null;
    }

    return data
      ? {
          id: data.id,
          slug: data.slug,
          title: data.title,
          description: data.description,
          price: data.price,
          images: data.images || [],
          category: data.category,
          location: data.location,
          status: data.status,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        }
      : null;
  } catch (error) {
    console.error('Error fetching listing:', error);
    return null;
  }
}

/**
 * Search listings with filters
 * Uses the public API endpoint (no auth required)
 */
export async function searchListings(
  params: ListingSearchParams = {}
): Promise<ListingSearchResult> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 12;

  try {
    const query = supabase
      .from('public_listings_view')
      .select('id, slug, title, description, price, images, category, location, status, created_at, updated_at', { count: 'exact' })
      .eq('status', 'active')
      .range((page - 1) * limit, page * limit - 1);

    if (params.category) query.eq('category', params.category);
    if (params.query) query.ilike('title', `%${params.query}%`);
    if (params.minPrice) query.gte('price', params.minPrice);
    if (params.maxPrice) query.lte('price', params.maxPrice);
    if (params.sortBy) query.order(params.sortBy === 'date' ? 'created_at' : params.sortBy, { ascending: params.sortOrder === 'asc' });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to search listings: ${error.message}`);
    }

    const listings = (data || []).map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      description: item.description,
      price: item.price,
      images: item.images || [],
      category: item.category,
      location: item.location,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return { listings, total, page, limit, totalPages };
  } catch (error) {
    console.error('Error searching listings:', error);
    return { listings: [], total: 0, page: 1, limit: 12, totalPages: 0 };
  }
}

/**
 * Get listings by category
 */
export async function getListingsByCategory(
  category: string,
  page = 1,
  limit = 12
): Promise<ListingSearchResult> {
  return searchListings({ category, page, limit });
}

/**
 * Get featured/promoted listings for homepage
 * Uses the public API endpoint (no auth required)
 */
export async function getFeaturedListings(limit = 6): Promise<Listing[]> {
  try {
    const { data, error } = await supabase
      .from('public_listings_view')
      .select('id, slug, title, description, price, images, category, location, status, created_at, updated_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch featured listings: ${error.message}`);
    }

    return (data || []).map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      description: item.description,
      price: item.price,
      images: item.images || [],
      category: item.category,
      location: item.location,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  } catch (error) {
    console.error('Error fetching featured listings:', error);
    return [];
  }
}

/**
 * Get all categories for navigation
 * Uses Supabase public view with RLS-friendly anon access
 */
export async function getCategories(): Promise<
  Array<{ slug: string; name: string; count: number }>
> {
  try {
    const { data, error } = await supabase
      .from('categories_view')
      .select('slug, name, count')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Format price for display
 * CUSTOMIZE: Update currency and formatting for your locale
 */
export function formatPrice(price: number | undefined): string {
  if (price === undefined || price === null) return 'Contact for price';

  // CUSTOMIZE: Update currency code and locale
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Generate static params for SSG
 * Used by generateStaticParams in page components
 */
export async function getAllListingSlugs(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('public_listings_view')
      .select('slug')
      .eq('status', 'active')
      .limit(10000);

    if (error) return [];
    return data?.map((l) => l.slug) || [];
  } catch {
    return [];
  }
}

/**
 * Get popular listing slugs for SSG pre-generation
 * Returns the most viewed listings for static generation at build time
 */
export async function getPopularListingSlugs(limit = 500): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('public_listings_view')
      .select('slug')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return [];
    return data?.map((l) => l.slug) || [];
  } catch {
    return [];
  }
}
