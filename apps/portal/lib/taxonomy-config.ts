/**
 * Taxonomy Configuration Utilities
 * 
 * Bridges the @listing-platform/config package with the portal app
 */

import type { Metadata } from "next";
import type { TaxonomyConfig, TaxonomyPath } from "@listing-platform/config";

// Extend TaxonomyPath to include _segments for internal use
type TaxonomyPathWithSegments = TaxonomyPath & { _segments?: string[] };

// Default to industry config - can be overridden by environment variable
const TAXONOMY_TYPE = process.env.TAXONOMY_CONFIG || "industry";

/**
 * Get the active taxonomy configuration
 */
export async function getTaxonomyConfig(): Promise<TaxonomyConfig> {
  try {
    // Dynamic import based on environment variable
    let config: TaxonomyConfig;
    
    switch (TAXONOMY_TYPE) {
      case "location":
        config = (await import("@/../config/taxonomies/location.config")).default;
        break;
      case "hybrid":
        config = (await import("@/../config/taxonomies/hybrid.config")).default;
        break;
      case "industry":
      default:
        config = (await import("@/../config/taxonomies/industry.config")).default;
        break;
    }
    
    return config;
  } catch (error) {
    console.error("Error loading taxonomy config:", error);
    // Return a minimal default config
    return {
      taxonomyType: "industry",
      name: "Listing Platform",
      primaryTaxonomy: {
        name: "category",
        slug: "category",
        hierarchical: false,
        urlPattern: "/{category}/{slug}",
        labels: {
          singular: "Category",
          plural: "Categories",
        },
      },
      listingFields: [],
      enabledFeatures: {
        reviews: true,
        booking: false,
        maps: true,
        inquiry: true,
        comparison: false,
      },
      seoTemplate: {
        titlePattern: "{title} | Listing Platform",
        descriptionPattern: "{description}",
        schemaType: "Thing",
      },
    };
  }
}

/**
 * Parse URL segments into a taxonomy path based on config
 * 
 * @example
 * // Industry: ['lawyers', 'john-doe'] => { profession: 'lawyers', slug: 'john-doe' }
 * // Location: ['usa', 'ca', 'sf', 'prop'] => { country: 'usa', region: 'ca', city: 'sf', slug: 'prop' }
 */
export function parseTaxonomyPath(
  segments: string[],
  config: TaxonomyConfig
): TaxonomyPathWithSegments {
  const pattern = config.primaryTaxonomy.urlPattern;
  const path: TaxonomyPathWithSegments = { slug: "" };
  
  // Extract variable names from pattern
  // E.g., "/{country}/{region}/{city}/{slug}" => ['country', 'region', 'city', 'slug']
  const variables = pattern.match(/\{(\w+)\}/g)?.map((v) => v.slice(1, -1)) || [];
  
  // Map segments to variables
  variables.forEach((variable, index) => {
    if (index < segments.length) {
      path[variable] = segments[index];
    }
  });
  
  // Slug is always the last segment
  if (segments.length > 0) {
    path.slug = segments[segments.length - 1];
  }
  
  // Store the raw segments for lookup
  path._segments = segments;
  
  return path;
}

/**
 * Generate URL from taxonomy path
 */
export function generateTaxonomyURL(
  path: TaxonomyPath,
  config: TaxonomyConfig
): string {
  let url = config.primaryTaxonomy.urlPattern;
  
  Object.keys(path).forEach((key) => {
    if (key !== "_segments") {
      url = url.replace(`{${key}}`, path[key] as string);
    }
  });
  
  return url;
}

/**
 * Generate SEO metadata from listing data
 */
export function generateSEOMetadata(
  listing: Record<string, unknown>,
  config: TaxonomyConfig,
  path: TaxonomyPath
): Metadata {
  const seoTemplate = config.seoTemplate;
  
  // Build data object for template replacement
  const data: Record<string, string> = {
    ...(listing as Record<string, string>),
    ...(listing.custom_fields as Record<string, string> || {}),
    site_name: config.name,
  };
  
  // Add taxonomy data
  Object.keys(path).forEach((key) => {
    if (key !== "_segments") {
      data[key] = path[key] as string;
    }
  });
  
  // Generate title
  let title = seoTemplate.titlePattern;
  Object.keys(data).forEach((key) => {
    title = title.replace(`{${key}}`, data[key] || "");
  });
  
  // Generate description
  let description = seoTemplate.descriptionPattern;
  Object.keys(data).forEach((key) => {
    description = description.replace(`{${key}}`, data[key] || "");
  });
  
  // Truncate description if too long
  if (description.length > 160) {
    description = description.substring(0, 157) + "...";
  }
  
  // Get images
  const images = (listing.images as string[]) || [];
  const primaryImage = images[0];
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(primaryImage && { images: [primaryImage] }),
      ...seoTemplate.additionalMeta,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(primaryImage && { images: [primaryImage] }),
    },
  };
}

/**
 * Generate JSON-LD structured data for a listing
 */
export function generateListingJsonLd(
  listing: Record<string, unknown>,
  config: TaxonomyConfig,
  url: string
): Record<string, unknown> {
  const schemaType = config.seoTemplate.schemaType;
  
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: listing.title,
    description: listing.description,
    url,
  };
  
  // Add images
  if (listing.images && Array.isArray(listing.images) && listing.images.length > 0) {
    jsonLd.image = listing.images;
  }
  
  // Add location if available
  if (listing.location) {
    const location = listing.location as Record<string, unknown>;
    if (location.lat && location.lng) {
      jsonLd.geo = {
        "@type": "GeoCoordinates",
        latitude: location.lat,
        longitude: location.lng,
      };
    }
    if (location.address || location.city) {
      jsonLd.address = {
        "@type": "PostalAddress",
        streetAddress: location.address,
        addressLocality: location.city,
        addressRegion: location.state || location.region,
        addressCountry: location.country,
      };
    }
  }
  
  // Add rating if available
  if (listing.rating_average && listing.rating_count) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: listing.rating_average,
      reviewCount: listing.rating_count,
    };
  }
  
  // Add price if available
  if (listing.price) {
    jsonLd.offers = {
      "@type": "Offer",
      price: listing.price,
      priceCurrency: "USD",
    };
  }
  
  // Add schema-specific fields
  switch (schemaType) {
    case "ProfessionalService":
    case "LocalBusiness":
      if (listing.custom_fields) {
        const cf = listing.custom_fields as Record<string, unknown>;
        if (cf.phone) jsonLd.telephone = cf.phone;
        if (cf.email) jsonLd.email = cf.email;
        if (cf.website) jsonLd.url = cf.website;
      }
      break;
      
    case "RealEstateListing":
    case "Accommodation":
      if (listing.custom_fields) {
        const cf = listing.custom_fields as Record<string, unknown>;
        if (cf.bedrooms) jsonLd.numberOfBedrooms = cf.bedrooms;
        if (cf.bathrooms) jsonLd.numberOfBathroomsTotal = cf.bathrooms;
        if (cf.sqft) jsonLd.floorSize = { "@type": "QuantitativeValue", value: cf.sqft, unitCode: "FTK" };
      }
      break;
      
    case "Product":
      jsonLd.offers = {
        "@type": "Offer",
        price: listing.price,
        priceCurrency: "USD",
        availability: listing.status === "active" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      };
      break;
  }
  
  return jsonLd;
}

/**
 * Check if a feature is enabled in the current taxonomy config
 */
export function isFeatureEnabled(
  config: TaxonomyConfig,
  feature: keyof TaxonomyConfig["enabledFeatures"]
): boolean {
  return config.enabledFeatures[feature] === true;
}

