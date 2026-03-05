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
  phone?: string;
  email?: string;
  website?: string;
  services?: string[];
  status: 'active' | 'pending' | 'sold' | 'archived';
  isUnclaimed?: boolean;
  effectiveTier?: import("@listing-platform/config").ListingTier;
  cardSizeVariant?: import("@listing-platform/config").ListingCardSizeVariant;
  accountPlan?: string;
  subscriptionTierOverride?: import("@listing-platform/config").ListingTier;
  topTierFeatures?: import("@listing-platform/config").TopTierFeatureFlags;
  featureAccess?: import("@listing-platform/config").ListingFeatureAccess;
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

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  ListingTier,
  TopTierFeatureFlags,
} from "@listing-platform/config";
import {
  buildFeatureAccess,
  resolveCardSizeVariant,
  resolveEffectiveTier,
  resolveTopTierFeatures,
} from "./listing-feature-policy";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
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
  if (!_supabase) _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _supabase;
}

function hasSupabase(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Fallback image when listing has no images from DB.
 * Images come from Supabase (gallery, featured_image); use this only when images array is empty.
 */
export const PLACEHOLDER_LISTING_IMAGE =
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800";

function normalizeImageUrls(images: string[] | null | undefined): string[] {
  if (!images || images.length === 0) return [];
  return images
    .map((img) => {
      if (!img) return null;
      const trimmed = img.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed.url === "string") return parsed.url;
        } catch (_e) {
          return null;
        }
      }
      return trimmed;
    })
    .filter((u): u is string => !!u && /^https?:\/\//.test(u));
}

type PublicListingRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number | null;
  images: string[] | null;
  category: string | null;
  location: Record<string, unknown> | null;
  status: string;
  is_unclaimed?: boolean;
  effective_subscription_tier?: string | null;
  card_size_variant?: string | null;
  account_plan?: string | null;
  subscription_tier_override?: string | null;
  top_tier_features?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function normalizeTier(value: string | null | undefined): ListingTier | undefined {
  if (value === "base" || value === "middle" || value === "top") return value;
  return undefined;
}

function mapPublicListingRow(row: PublicListingRow): Listing {
  const isUnclaimed = row.is_unclaimed ?? false;
  const effectiveTier = resolveEffectiveTier({
    isUnclaimed,
    effectiveTier: normalizeTier(row.effective_subscription_tier),
    accountPlan: row.account_plan,
    subscriptionTierOverride: normalizeTier(row.subscription_tier_override),
    topTierFeatures: row.top_tier_features || {},
  });

  const cardSizeVariant = resolveCardSizeVariant(
    {
      isUnclaimed,
      cardSizeVariant: row.card_size_variant,
      effectiveTier,
    },
    effectiveTier
  );

  const topTierFeatures = resolveTopTierFeatures(
    {
      isUnclaimed,
      effectiveTier,
      topTierFeatures: row.top_tier_features || {},
    },
    effectiveTier
  ) as TopTierFeatureFlags;

  const featureAccess = buildFeatureAccess({
    isUnclaimed,
    effectiveTier,
    topTierFeatures,
  });

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    price: row.price ?? undefined,
    images: normalizeImageUrls(row.images),
    category: row.category ?? undefined,
    location: row.location ?? undefined,
    status: row.status as 'active' | 'pending' | 'sold' | 'archived',
    isUnclaimed,
    effectiveTier,
    cardSizeVariant,
    accountPlan: row.account_plan ?? undefined,
    subscriptionTierOverride: normalizeTier(row.subscription_tier_override),
    topTierFeatures,
    featureAccess,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetch a single listing by slug
 * Uses the public API endpoint (no auth required)
 */
export async function getListingBySlug(slug: string): Promise<Listing | null> {
  if (!hasSupabase()) return null;
  try {
    const { data, error } = await getSupabase()
      .from('public_listings_view')
      .select(
        "id, slug, title, description, price, images, category, location, status, is_unclaimed, effective_subscription_tier, card_size_variant, account_plan, subscription_tier_override, top_tier_features, created_at, updated_at"
      )
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch listing by slug:', error.message);
      return null;
    }

    if (!data) {
      return null;
    }

    const listingData = data as PublicListingRow;
    return mapPublicListingRow(listingData);
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
  if (!hasSupabase()) return null;
  try {
    const { data, error } = await getSupabase()
      .from('public_listings_view')
      .select(
        "id, slug, title, description, price, images, category, location, status, is_unclaimed, effective_subscription_tier, card_size_variant, account_plan, subscription_tier_override, top_tier_features, created_at, updated_at"
      )
      .eq('id', id)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch listing by id:', error.message);
      return null;
    }

    if (!data) {
      return null;
    }

    const listingData = data as PublicListingRow;
    return mapPublicListingRow(listingData);
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

  if (!hasSupabase()) {
    return { listings: [], total: 0, page, limit, totalPages: 0 };
  }

  try {
    const query = getSupabase()
      .from('public_listings_view')
      .select(
        "id, slug, title, description, price, images, category, location, status, is_unclaimed, effective_subscription_tier, card_size_variant, account_plan, subscription_tier_override, top_tier_features, created_at, updated_at",
        { count: "exact" }
      )
      .eq('status', 'active')
      .range((page - 1) * limit, page * limit - 1);

    if (params.category) query.eq('category', params.category);
    if (params.query) query.ilike('title', `%${params.query}%`);
    if (params.minPrice) query.gte('price', params.minPrice);
    if (params.maxPrice) query.lte('price', params.maxPrice);
    if (params.sortBy) query.order(params.sortBy === 'date' ? 'created_at' : params.sortBy, { ascending: params.sortOrder === 'asc' });

    // Location: search by city, state, country, or address (e.g. zip, neighborhood)
    if (params.location?.trim()) {
      const raw = params.location.trim();
      const loc = raw.replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/,/g, " ");
      const pattern = `%${loc}%`;
      query.or(
        `location->>city.ilike.${pattern},location->>state.ilike.${pattern},location->>country.ilike.${pattern},location->>address.ilike.${pattern}`
      );
    }

    const result = await query;
    const { data, error, count } = result;

    if (error) {
      throw new Error(`Failed to search listings: ${error.message}`);
    }

    const listingItems = (data || []) as PublicListingRow[];
    const listings = listingItems.map(mapPublicListingRow);

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
  if (!hasSupabase()) return [];
  try {
    const { data, error } = await getSupabase()
      .from('public_listings_view')
      .select(
        "id, slug, title, description, price, images, category, location, status, is_unclaimed, effective_subscription_tier, card_size_variant, account_plan, subscription_tier_override, top_tier_features, created_at, updated_at"
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Featured listings Supabase error:', error.message);
      return [];
    }

    const listingItems = (data || []) as PublicListingRow[];
    return listingItems.map(mapPublicListingRow);
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
  if (!hasSupabase()) return [];

  try {
    const { data, error } = await getSupabase()
      .from('categories_view')
      .select('slug, name, count')
      .order('name', { ascending: true });

    if (error) {
      console.error('Categories Supabase error:', error.message);
      return [];
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
  if (!hasSupabase()) return [];
  try {
    const { data, error } = await getSupabase()
      .from('public_listings_view')
      .select('slug')
      .eq('status', 'active')
      .limit(10000);

    if (error) return [];
    
    // Type assertion to help TypeScript understand the data structure
    const slugs = (data || []) as Array<{ slug: string }>;
    return slugs.map((l) => l.slug);
  } catch {
    return [];
  }
}

/**
 * Get popular listing slugs for SSG pre-generation
 * Returns the most viewed listings for static generation at build time
 */
export async function getPopularListingSlugs(limit = 500): Promise<string[]> {
  if (!hasSupabase()) return [];
  try {
    const { data, error } = await getSupabase()
      .from('public_listings_view')
      .select('slug')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return [];
    
    // Type assertion to help TypeScript understand the data structure
    const slugs = (data || []) as Array<{ slug: string }>;
    return slugs.map((l) => l.slug);
  } catch {
    return [];
  }
}
