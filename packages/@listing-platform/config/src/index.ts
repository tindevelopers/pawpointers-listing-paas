/**
 * @listing-platform/config
 * Configuration system for the listing platform base template
 */

// Export types
export * from './types';

// Export services
export * from './taxonomy-service';

// Re-export for convenience
export { initTaxonomyService, getTaxonomyService, TaxonomyService } from './taxonomy-service';
export type { 
  TaxonomyConfig,
  TaxonomyType,
  FieldDefinition,
  TaxonomyDefinition,
  SEOTemplate,
  PlatformConfig,
  MediaConfig,
  DeploymentConfig,
  ListingPlatformConfig
} from './types';

