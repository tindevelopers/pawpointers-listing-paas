/**
 * Configuration Loader
 * Loads the appropriate taxonomy configuration based on environment variables
 * 
 * CUSTOMIZE: This is the main entry point for all platform configuration.
 * Import configs from here throughout the application.
 */

import type { TaxonomyConfig } from '@listing-platform/config';
import industryConfig from './taxonomies/industry.config';
import locationConfig from './taxonomies/location.config';
import hybridConfig from './taxonomies/hybrid.config';
import { featuresConfig } from './features.config';
import { listingConfig } from './listing.config';
import { brandConfig } from './brand.config';
import { routingConfig } from './routing.config';

// Determine which config to load
const TAXONOMY_CONFIG = process.env.TAXONOMY_CONFIG || process.env.NEXT_PUBLIC_TAXONOMY_CONFIG || 'industry';

/**
 * Get the active taxonomy configuration
 */
export function getTaxonomyConfig(): TaxonomyConfig {
  switch (TAXONOMY_CONFIG) {
    case 'location':
      return locationConfig;
    case 'hybrid':
      return hybridConfig;
    case 'industry':
    default:
      return industryConfig;
  }
}

/**
 * Get features configuration
 */
export function getFeaturesConfig() {
  return featuresConfig;
}

/**
 * Get listing configuration
 * CUSTOMIZE: Use this to access listing type settings
 */
export function getListingConfig() {
  return listingConfig;
}

/**
 * Get brand configuration
 * CUSTOMIZE: Use this to access branding settings
 */
export function getBrandConfig() {
  return brandConfig;
}

/**
 * Get routing configuration
 * CUSTOMIZE: Use this to access URL routing strategy
 */
export function getRoutingConfig() {
  return routingConfig;
}

/**
 * Get the taxonomy type
 */
export function getTaxonomyType(): 'industry' | 'location' | 'hybrid' {
  return TAXONOMY_CONFIG as any;
}

// Export configurations
export { industryConfig, locationConfig, hybridConfig, featuresConfig };
export { listingConfig } from './listing.config';
export { brandConfig } from './brand.config';
export { routingConfig } from './routing.config';
export * from './programs.config';

// Export types
export type { TaxonomyConfig } from '@listing-platform/config';
export type { ListingConfig, ListingFieldConfig, CustomFieldConfig } from './listing.config';
export type { BrandConfig } from './brand.config';
export type { RoutingConfig, RoutingStrategy, IndustryRoutingConfig, GeographicRoutingConfig } from './routing.config';

// Default export
export default {
  taxonomy: getTaxonomyConfig(),
  features: featuresConfig,
  listing: listingConfig,
  brand: brandConfig,
  routing: routingConfig,
  type: getTaxonomyType(),
};



