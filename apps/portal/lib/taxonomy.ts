/**
 * Taxonomy Data Fetching Utilities
 * 
 * Fetches listings and taxonomy terms based on dynamic URL patterns
 * 
 * NOTE: API server is deprovisioned. This module now uses Supabase directly
 * or gracefully handles API failures with fallbacks.
 */

import type { TaxonomyPath } from "@listing-platform/config";
import type { Listing, ListingSearchResult } from "./listings";
import { getListingBySlug, searchListings } from "./listings";

// API server is deprovisioned - using Supabase directly instead
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const USE_API = false; // Set to true if API server is provisioned later

export interface TaxonomyTerm {
  id: string;
  slug: string;
  name: string;
  description?: string;
  parentId?: string;
  level: number;
  listingCount: number;
  children?: TaxonomyTerm[];
  image?: string;
}

export interface TaxonomyListingResult extends ListingSearchResult {
  term?: TaxonomyTerm;
}

/**
 * Get a listing by its taxonomy path
 * Determines if the path points to a listing or a category
 */
export async function getListingByTaxonomyPath(
  path: TaxonomyPath
): Promise<Listing | null> {
  try {
    const segments = (path as TaxonomyPath & { _segments?: string[] })._segments || [];
    if (segments.length === 0) return null;
    
    // The slug is the last segment
    const slug = segments[segments.length - 1];
    
    // Use Supabase directly (API server is deprovisioned)
    const { getListingBySlug } = await import('./listings');
    const listing = await getListingBySlug(slug);
    
    if (!listing) return null;
    
    // Verify the listing belongs to the correct taxonomy path
    // This ensures /lawyers/john-doe doesn't show a doctor's listing
    if (segments.length > 1) {
      const taxonomySlug = segments[0];
      
      // Check if listing category matches taxonomy path
      if (listing.category?.toLowerCase() !== taxonomySlug.toLowerCase()) {
        return null;
      }
    }
    
    return listing;
  } catch (error) {
    console.error("Error fetching listing by taxonomy path:", error);
    return null;
  }
}

/**
 * Get a taxonomy term by its path
 */
export async function getTaxonomyTerm(
  path: TaxonomyPath
): Promise<TaxonomyTerm | null> {
  try {
    const segments = (path as TaxonomyPath & { _segments?: string[] })._segments || [];
    if (segments.length === 0) return null;
    
    // API server is deprovisioned - create term from path for graceful degradation
    // TODO: Implement Supabase-based taxonomy terms if needed
    const termSlug = segments[segments.length - 1];
    
    // Try API if enabled (for future use)
    if (USE_API) {
      try {
        const response = await fetch(
          `${API_URL}/api/public/taxonomy/${segments.join("/")}`,
          { next: { revalidate: 300 } }
        );
        
        if (response.ok) {
          const result = await response.json();
          if (result.data) return result.data;
        }
      } catch (apiError) {
        // Fall through to stub implementation
        console.warn('API server not available, using stub taxonomy term');
      }
    }
    
    // Stub: Create a term from the path
    // Count listings with matching category to get listingCount
    const { searchListings } = await import('./listings');
    const category = segments[0];
    const { total } = await searchListings({ category, limit: 1 });
    
    return {
      id: segments.join("-"),
      slug: termSlug,
      name: formatTermName(termSlug),
      level: segments.length - 1,
      listingCount: total,
    };
  } catch (error) {
    console.error("Error fetching taxonomy term:", error);
    
    // Fallback: return basic term structure
    const segments = (path as TaxonomyPath & { _segments?: string[] })._segments || [];
    if (segments.length > 0) {
      return {
        id: segments.join("-"),
        slug: segments[segments.length - 1],
        name: formatTermName(segments[segments.length - 1]),
        level: segments.length - 1,
        listingCount: 0,
      };
    }
    
    return null;
  }
}

/**
 * Get listings for a specific taxonomy term
 */
export async function getListingsByTaxonomyTerm(
  path: TaxonomyPath,
  options: { page?: number; limit?: number; sortBy?: string } = {}
): Promise<TaxonomyListingResult> {
  try {
    const segments = (path as TaxonomyPath & { _segments?: string[] })._segments || [];
    if (segments.length === 0) {
      return { listings: [], total: 0, page: 1, limit: 12, totalPages: 0 };
    }
    
    // Use Supabase directly (API server is deprovisioned)
    const { searchListings } = await import('./listings');
    const category = segments[0]; // Use first segment as category
    
    const result = await searchListings({
      category,
      page: options.page || 1,
      limit: options.limit || 12,
      sortBy: options.sortBy as 'price' | 'date' | 'relevance' | undefined,
    });
    
    return {
      listings: result.listings,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  } catch (error) {
    console.error("Error fetching listings by taxonomy:", error);
    return { listings: [], total: 0, page: 1, limit: 12, totalPages: 0 };
  }
}

/**
 * Get popular taxonomy paths for static generation
 */
export async function getPopularTaxonomyPaths(limit = 1000): Promise<string[][]> {
  try {
    // API server is deprovisioned - generate paths from Supabase listings
    const { searchListings } = await import('./listings');
    
    // Get unique categories from listings
    const { listings } = await searchListings({ limit: 1000 });
    const categories = new Set<string>();
    
    listings.forEach(listing => {
      if (listing.category) {
        categories.add(listing.category);
      }
    });
    
    // Return paths as [category, slug] arrays
    const paths: string[][] = [];
    for (const category of Array.from(categories).slice(0, limit)) {
      // Add category-only paths
      paths.push([category]);
      
      // Add listing paths (category + slug)
      listings
        .filter(l => l.category === category)
        .slice(0, 10) // Limit listings per category
        .forEach(listing => {
          if (listing.slug) {
            paths.push([category, listing.slug]);
          }
        });
    }
    
    return paths.slice(0, limit);
  } catch (error) {
    console.error("Error fetching taxonomy paths:", error);
    return [];
  }
}

/**
 * Get child terms for a parent taxonomy term
 */
export async function getChildTerms(
  parentPath: TaxonomyPath
): Promise<TaxonomyTerm[]> {
  try {
    // API server is deprovisioned - return empty array for now
    // TODO: Implement Supabase-based child terms if needed
    if (USE_API) {
      const segments = (parentPath as TaxonomyPath & { _segments?: string[] })._segments || [];
      const parentSlug = segments.join("/");
      
      try {
        const response = await fetch(
          `${API_URL}/api/public/taxonomy/${parentSlug}/children`,
          { next: { revalidate: 300 } }
        );
        
        if (response.ok) {
          const result = await response.json();
          if (result.data) return result.data;
        }
      } catch (apiError) {
        // Fall through to empty array
      }
    }
    
    // Stub: Return empty array (no child terms implemented yet)
    return [];
  } catch (error) {
    console.error("Error fetching child terms:", error);
    return [];
  }
}

/**
 * Get breadcrumb data for a taxonomy path
 */
export async function getTaxonomyBreadcrumbs(
  path: TaxonomyPath
): Promise<Array<{ label: string; href: string }>> {
  const segments = (path as TaxonomyPath & { _segments?: string[] })._segments || [];
  const breadcrumbs: Array<{ label: string; href: string }> = [
    { label: "Home", href: "/" },
  ];
  
  let currentPath = "";
  
  for (const segment of segments.slice(0, -1)) {
    currentPath += `/${segment}`;
    breadcrumbs.push({
      label: formatTermName(segment),
      href: currentPath,
    });
  }
  
  return breadcrumbs;
}

/**
 * Format a slug into a human-readable name
 */
function formatTermName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

