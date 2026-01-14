import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

/**
 * Dynamic Sitemap Generation
 *
 * Generates a sitemap for search engines including all published listings.
 * This helps with SEO by ensuring all pages are discoverable.
 *
 * NOTE: API server is deprovisioned. This now uses Supabase directly.
 *
 * CUSTOMIZE: Update the base URL and add additional pages specific to your platform
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const USE_API = false; // Set to true if API server is provisioned later
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourplatform.com';

// Initialize Supabase client
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

let supabase: ReturnType<typeof createClient> | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

interface SitemapListing {
  slug: string;
  updated_at: string;
  published_at: string;
}

interface SitemapCategory {
  slug: string;
  name: string;
  count: number;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/listings`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // CUSTOMIZE: Add more static pages
    // {
    //   url: `${SITE_URL}/about`,
    //   lastModified: new Date(),
    //   changeFrequency: 'monthly',
    //   priority: 0.5,
    // },
  ];

  // Fetch all listings for sitemap from Supabase (API server is deprovisioned)
  let listingPages: MetadataRoute.Sitemap = [];
  try {
    if (supabase && !USE_API) {
      const { data, error } = await supabase
        .from('public_listings_view')
        .select('slug, updated_at, created_at')
        .eq('status', 'active')
        .limit(50000);

      if (!error && data) {
        listingPages = data.map((listing: any) => ({
          url: `${SITE_URL}/listings/${listing.slug}`,
          lastModified: new Date(listing.updated_at || listing.created_at),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }));
      }
    } else if (USE_API) {
      // Fallback to API if enabled
      const response = await fetch(`${API_URL}/api/public/sitemap?limit=50000`, {
        next: { revalidate: 3600 },
      });

      if (response.ok) {
        const result = await response.json();
        const listings: SitemapListing[] = result.data?.listings || [];

        listingPages = listings.map((listing) => ({
          url: `${SITE_URL}/listings/${listing.slug}`,
          lastModified: new Date(listing.updated_at || listing.published_at),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }));
      }
    }
  } catch (error) {
    console.error('Error fetching listings for sitemap:', error);
  }

  // Fetch all categories for sitemap from Supabase (API server is deprovisioned)
  let categoryPages: MetadataRoute.Sitemap = [];
  try {
    if (supabase && !USE_API) {
      // Get unique categories from listings
      const { data, error } = await supabase
        .from('public_listings_view')
        .select('category')
        .eq('status', 'active')
        .not('category', 'is', null);

      if (!error && data) {
        const uniqueCategories = new Set<string>();
        data.forEach((listing: any) => {
          if (listing.category) {
            uniqueCategories.add(listing.category);
          }
        });

        categoryPages = Array.from(uniqueCategories).map((category) => ({
          url: `${SITE_URL}/categories/${category}`,
          lastModified: new Date(),
          changeFrequency: 'daily' as const,
          priority: 0.8,
        }));
      }
    } else if (USE_API) {
      // Fallback to API if enabled
      const response = await fetch(`${API_URL}/api/public/categories`, {
        next: { revalidate: 3600 },
      });

      if (response.ok) {
        const result = await response.json();
        const categories: SitemapCategory[] = result.data || [];

        categoryPages = categories.map((category) => ({
          url: `${SITE_URL}/categories/${category.slug}`,
          lastModified: new Date(),
          changeFrequency: 'daily' as const,
          priority: 0.8,
        }));
      }
    }
  } catch (error) {
    console.error('Error fetching categories for sitemap:', error);
  }

  return [...staticPages, ...categoryPages, ...listingPages];
}
