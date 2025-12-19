/**
 * Configuration Loader
 * Loads the appropriate taxonomy configuration based on environment variables
 */

import type { TaxonomyConfig } from '@listing-platform/config';
import industryConfig from './taxonomies/industry.config';
import locationConfig from './taxonomies/location.config';
import hybridConfig from './taxonomies/hybrid.config';
import { featuresConfig } from './features.config';

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
 * Get the taxonomy type
 */
export function getTaxonomyType(): 'industry' | 'location' | 'hybrid' {
  return TAXONOMY_CONFIG as any;
}

// Export configurations
export { industryConfig, locationConfig, hybridConfig, featuresConfig };

// Export types
export type { TaxonomyConfig } from '@listing-platform/config';

// Default export
export default {
  taxonomy: getTaxonomyConfig(),
  features: featuresConfig,
  type: getTaxonomyType(),
};

