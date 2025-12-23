/**
 * Taxonomy Data Fetching Utilities
 * 
 * Fetches listings and taxonomy terms based on dynamic URL patterns
 */

import type { TaxonomyPath } from "@listing-platform/config";
import type { Listing, ListingSearchResult } from "./listings";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
    const segments = path._segments as string[] || [];
    if (segments.length === 0) return null;
    
    // The slug is the last segment
    const slug = segments[segments.length - 1];
    
    // Try to fetch as a listing first
    const response = await fetch(
      `${API_URL}/api/public/listings/slug/${slug}`,
      { next: { revalidate: 60 } }
    );
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch listing: ${response.statusText}`);
    }
    
    const result = await response.json();
    const listing = result.data;
    
    if (!listing) return null;
    
    // Verify the listing belongs to the correct taxonomy path
    // This ensures /lawyers/john-doe doesn't show a doctor's listing
    if (segments.length > 1) {
      const taxonomySlug = segments[0];
      
      // Check if listing has matching primary taxonomy
      if (listing.primary_taxonomy_slug && listing.primary_taxonomy_slug !== taxonomySlug) {
        // Check category as fallback
        if (listing.category?.toLowerCase() !== taxonomySlug.toLowerCase()) {
          return null;
        }
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
    const segments = path._segments as string[] || [];
    if (segments.length === 0) return null;
    
    // Build the taxonomy path for the API
    const termSlug = segments.join("/");
    
    const response = await fetch(
      `${API_URL}/api/public/taxonomy/${termSlug}`,
      { next: { revalidate: 300 } }
    );
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch taxonomy term: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || null;
  } catch (error) {
    console.error("Error fetching taxonomy term:", error);
    
    // Fallback: try to create a term from the path for graceful degradation
    const segments = path._segments as string[] || [];
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
    const segments = path._segments as string[] || [];
    if (segments.length === 0) {
      return { listings: [], total: 0, page: 1, limit: 12, totalPages: 0 };
    }
    
    const params = new URLSearchParams();
    params.set("taxonomy", segments.join("/"));
    params.set("page", String(options.page || 1));
    params.set("limit", String(options.limit || 12));
    if (options.sortBy) params.set("sortBy", options.sortBy);
    
    const response = await fetch(
      `${API_URL}/api/public/listings?${params.toString()}`,
      { next: { revalidate: 60 } }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch listings: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      listings: result.data || [],
      total: result.meta?.total || 0,
      page: result.meta?.page || 1,
      limit: result.meta?.limit || 12,
      totalPages: result.meta?.totalPages || 0,
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
    const response = await fetch(
      `${API_URL}/api/public/sitemap/taxonomy?limit=${limit}`
    );
    
    if (!response.ok) return [];
    
    const result = await response.json();
    
    // Return array of path segments
    return (result.data?.paths || []).map((path: string) => 
      path.split("/").filter(Boolean)
    );
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
    const segments = parentPath._segments as string[] || [];
    const parentSlug = segments.join("/");
    
    const response = await fetch(
      `${API_URL}/api/public/taxonomy/${parentSlug}/children`,
      { next: { revalidate: 300 } }
    );
    
    if (!response.ok) return [];
    
    const result = await response.json();
    return result.data || [];
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
  const segments = path._segments as string[] || [];
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

