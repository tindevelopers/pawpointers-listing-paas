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
  excerpt?: string;
  tagline?: string;
  price?: number;
  currency?: string;
  priceType?: string;
  images: string[];
  featuredImage?: string;
  videoUrl?: string;
  category?: string;
  tags?: string[];
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
  contact?: ListingContact;
  providerProfile?: ListingProviderProfile;
  services?: string[];
  serviceItems?: ListingService[];
  packages?: ListingPackage[];
  hours?: ListingHours;
  features?: ListingFeatures;
  social?: ListingSocial;
  serviceArea?: ListingServiceArea;
  ratingAverage?: number;
  ratingCount?: number;
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

export type ListingContact = {
  phone?: string;
  email?: string;
  website?: string;
  bookingUrl?: string;
  whatsappUrl?: string;
};

export type ListingProviderProfile = {
  businessName?: string;
  ownerName?: string;
  yearsExperience?: number;
  certifications?: string[];
  insured?: boolean;
  licenseNumber?: string;
  logoUrl?: string;
};

export type ListingService = {
  name: string;
  price?: number;
  currency?: string;
  priceType?: string;
  durationMinutes?: number;
  description?: string;
  featured?: boolean;
};

export type ListingPackage = {
  name: string;
  price?: number;
  currency?: string;
  description?: string;
  includedServiceNames?: string[];
};

export type ListingHoursDay = {
  open: boolean;
  openTime?: string;
  closeTime?: string;
};

export type ListingHours = {
  mon?: ListingHoursDay;
  tue?: ListingHoursDay;
  wed?: ListingHoursDay;
  thu?: ListingHoursDay;
  fri?: ListingHoursDay;
  sat?: ListingHoursDay;
  sun?: ListingHoursDay;
};

export type ListingFeatures = {
  parking?: boolean;
  petFriendly?: boolean;
  mobileService?: boolean;
  organicProducts?: boolean;
  certifiedGroomers?: boolean;
  pickupDropoff?: boolean;
  spaServices?: boolean;
  ecoFriendly?: boolean;
  custom?: string[];
};

export type ListingSocial = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  linkedin?: string;
  youtube?: string;
  x?: string;
};

export type ListingServiceArea = {
  serviceMode?: "mobile" | "in_store" | "both";
  radius?: number;
  radiusUnit?: "mi" | "km";
};

export type ListingCustomFields = {
  schemaVersion?: number;
  category?: string;
  tags?: string[];
  tagline?: string;
  contact?: ListingContact;
  providerProfile?: ListingProviderProfile;
  serviceArea?: ListingServiceArea;
  services?: ListingService[];
  packages?: ListingPackage[];
  hours?: ListingHours;
  social?: ListingSocial;
  features?: ListingFeatures;
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return value;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value !== "boolean") return undefined;
  return value;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  return items.length > 0 ? items : undefined;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => isRecord(item)) as Record<string, unknown>[];
}

function parseListingCustomFields(value: unknown): ListingCustomFields | undefined {
  if (!isRecord(value)) return undefined;

  const contactRaw = isRecord(value.contact) ? value.contact : undefined;
  const providerRaw = isRecord(value.providerProfile) ? value.providerProfile : undefined;
  const serviceAreaRaw = isRecord(value.serviceArea) ? value.serviceArea : undefined;
  const socialRaw = isRecord(value.social) ? value.social : undefined;
  const featuresRaw = isRecord(value.features) ? value.features : undefined;
  const hoursRaw = isRecord(value.hours) ? value.hours : undefined;

  const parseHoursDay = (day: unknown): ListingHoursDay | undefined => {
    if (!isRecord(day)) return undefined;
    const open = asBoolean(day.open);
    if (open === undefined) return undefined;
    const openTime = asString(day.openTime);
    const closeTime = asString(day.closeTime);
    return { open, openTime, closeTime };
  };

  const services = asRecordArray(value.services).map((service) => {
    const name = asString(service.name);
    if (!name) return null;
    return {
      name,
      price: asNumber(service.price),
      currency: asString(service.currency),
      priceType: asString(service.priceType),
      durationMinutes: asNumber(service.durationMinutes),
      description: asString(service.description),
      featured: asBoolean(service.featured),
    } as ListingService;
  }).filter((item): item is ListingService => !!item);

  const packages = asRecordArray(value.packages).map((pkg) => {
    const name = asString(pkg.name);
    if (!name) return null;
    return {
      name,
      price: asNumber(pkg.price),
      currency: asString(pkg.currency),
      description: asString(pkg.description),
      includedServiceNames: asStringArray(pkg.includedServiceNames),
    } as ListingPackage;
  }).filter((item): item is ListingPackage => !!item);

  const hours: ListingHours | undefined = hoursRaw
    ? {
        mon: parseHoursDay(hoursRaw.mon),
        tue: parseHoursDay(hoursRaw.tue),
        wed: parseHoursDay(hoursRaw.wed),
        thu: parseHoursDay(hoursRaw.thu),
        fri: parseHoursDay(hoursRaw.fri),
        sat: parseHoursDay(hoursRaw.sat),
        sun: parseHoursDay(hoursRaw.sun),
      }
    : undefined;

  return {
    schemaVersion: asNumber(value.schemaVersion),
    category: asString(value.category),
    tags: asStringArray(value.tags),
    tagline: asString(value.tagline),
    contact: contactRaw
      ? {
          phone: asString(contactRaw.phone),
          email: asString(contactRaw.email),
          website: asString(contactRaw.website),
          bookingUrl: asString(contactRaw.bookingUrl),
          whatsappUrl: asString(contactRaw.whatsappUrl),
        }
      : undefined,
    providerProfile: providerRaw
      ? {
          businessName: asString(providerRaw.businessName),
          ownerName: asString(providerRaw.ownerName),
          yearsExperience: asNumber(providerRaw.yearsExperience),
          certifications: asStringArray(providerRaw.certifications),
          insured: asBoolean(providerRaw.insured),
          licenseNumber: asString(providerRaw.licenseNumber),
          logoUrl: asString(providerRaw.logoUrl),
        }
      : undefined,
    serviceArea: serviceAreaRaw
      ? {
          serviceMode: asString(serviceAreaRaw.serviceMode) as ListingServiceArea["serviceMode"],
          radius: asNumber(serviceAreaRaw.radius),
          radiusUnit: asString(serviceAreaRaw.radiusUnit) as ListingServiceArea["radiusUnit"],
        }
      : undefined,
    services: services.length > 0 ? services : undefined,
    packages: packages.length > 0 ? packages : undefined,
    hours,
    social: socialRaw
      ? {
          instagram: asString(socialRaw.instagram),
          facebook: asString(socialRaw.facebook),
          tiktok: asString(socialRaw.tiktok),
          linkedin: asString(socialRaw.linkedin),
          youtube: asString(socialRaw.youtube),
          x: asString(socialRaw.x),
        }
      : undefined,
    features: featuresRaw
      ? {
          parking: asBoolean(featuresRaw.parking),
          petFriendly: asBoolean(featuresRaw.petFriendly),
          mobileService: asBoolean(featuresRaw.mobileService),
          organicProducts: asBoolean(featuresRaw.organicProducts),
          certifiedGroomers: asBoolean(featuresRaw.certifiedGroomers),
          pickupDropoff: asBoolean(featuresRaw.pickupDropoff),
          spaServices: asBoolean(featuresRaw.spaServices),
          ecoFriendly: asBoolean(featuresRaw.ecoFriendly),
          custom: asStringArray(featuresRaw.custom),
        }
      : undefined,
  };
}

type PublicListingRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  excerpt: string | null;
  price: number | null;
  currency: string | null;
  price_type: string | null;
  featured_image: string | null;
  video_url: string | null;
  rating_average: number | null;
  rating_count: number | null;
  custom_fields: Record<string, unknown> | null;
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
  const customFields = parseListingCustomFields(row.custom_fields);
  const contact = customFields?.contact;
  const providerProfile = customFields?.providerProfile;
  const serviceItems = customFields?.services;
  const services = serviceItems?.map((service) => service.name).filter(Boolean);
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
    excerpt: row.excerpt ?? undefined,
    tagline: customFields?.tagline ?? row.excerpt ?? undefined,
    price: row.price ?? undefined,
    currency: row.currency ?? undefined,
    priceType: row.price_type ?? undefined,
    images: normalizeImageUrls(row.images),
    featuredImage: row.featured_image ?? undefined,
    videoUrl: row.video_url ?? undefined,
    category: row.category ?? undefined,
    tags: customFields?.tags,
    location: row.location ?? undefined,
    phone: contact?.phone,
    email: contact?.email,
    website: contact?.website,
    contact,
    providerProfile,
    services,
    serviceItems,
    packages: customFields?.packages,
    hours: customFields?.hours,
    features: customFields?.features,
    social: customFields?.social,
    serviceArea: customFields?.serviceArea,
    ratingAverage: row.rating_average ?? undefined,
    ratingCount: row.rating_count ?? undefined,
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
    customFields: row.custom_fields ?? undefined,
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
        "id, slug, title, description, excerpt, price, currency, price_type, featured_image, video_url, rating_average, rating_count, custom_fields, images, category, location, status, is_unclaimed, effective_subscription_tier, card_size_variant, account_plan, subscription_tier_override, top_tier_features, created_at, updated_at"
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
        "id, slug, title, description, excerpt, price, currency, price_type, featured_image, video_url, rating_average, rating_count, custom_fields, images, category, location, status, is_unclaimed, effective_subscription_tier, card_size_variant, account_plan, subscription_tier_override, top_tier_features, created_at, updated_at"
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
        "id, slug, title, description, excerpt, price, currency, price_type, featured_image, video_url, rating_average, rating_count, custom_fields, images, category, location, status, is_unclaimed, effective_subscription_tier, card_size_variant, account_plan, subscription_tier_override, top_tier_features, created_at, updated_at",
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
        "id, slug, title, description, excerpt, price, currency, price_type, featured_image, video_url, rating_average, rating_count, custom_fields, images, category, location, status, is_unclaimed, effective_subscription_tier, card_size_variant, account_plan, subscription_tier_override, top_tier_features, created_at, updated_at"
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
