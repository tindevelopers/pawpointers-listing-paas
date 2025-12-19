// ===================================
// CONFIGURATION TYPES
// ===================================

export type TaxonomyType = 'industry' | 'location' | 'hybrid' | 'category';

export type FieldType = 
  | 'text' 
  | 'number' 
  | 'boolean' 
  | 'select' 
  | 'multiselect' 
  | 'date' 
  | 'datetime'
  | 'location' 
  | 'location_multi'
  | 'rich_text'
  | 'email'
  | 'phone'
  | 'url'
  | 'file'
  | 'image';

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  searchable?: boolean;
  filterable?: boolean;
  displayInCard?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ value: string; label: string }>; // For select/multiselect
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  defaultValue?: any;
}

export interface TaxonomyDefinition {
  name: string;
  slug: string;
  hierarchical: boolean;
  urlPattern: string;
  levels?: string[]; // For hierarchical taxonomies like ['country', 'region', 'city']
  importance?: 'primary' | 'high' | 'medium' | 'low';
  labels: {
    singular: string;
    plural: string;
    all?: string;
  };
  showInNavigation?: boolean;
  showInFilters?: boolean;
}

export interface FeatureConfig {
  enabled: boolean;
  config?: Record<string, any>;
}

export interface SEOTemplate {
  titlePattern: string;
  descriptionPattern: string;
  schemaType: string; // Schema.org type
  additionalMeta?: Record<string, string>;
}

export interface TaxonomyConfig {
  taxonomyType: TaxonomyType;
  name: string;
  description?: string;
  primaryTaxonomy: TaxonomyDefinition;
  secondaryTaxonomies?: TaxonomyDefinition[];
  listingFields: FieldDefinition[];
  enabledFeatures: {
    reviews: boolean;
    booking: boolean;
    maps: boolean;
    inquiry: boolean;
    comparison: boolean;
    virtualTour?: boolean;
    messaging?: boolean;
    savedListings?: boolean;
    alerts?: boolean;
  };
  seoTemplate: SEOTemplate;
  searchConfig?: {
    defaultSort: 'relevance' | 'date' | 'price' | 'rating';
    allowedSorts: string[];
    resultsPerPage: number;
    enableFuzzySearch: boolean;
  };
}

export interface PlatformConfig {
  siteName: string;
  siteUrl: string;
  supportEmail: string;
  defaultCurrency: string;
  defaultLanguage: string;
  multiTenant: boolean;
  allowUserListings: boolean;
  requireVerification: boolean;
  moderationMode: 'auto' | 'manual' | 'none';
  maxImagesPerListing: number;
  maxVideoSize: number; // MB
  allowedImageFormats: string[];
}

export interface MediaConfig {
  storage: 'wasabi' | 's3' | 'cloudinary' | 'local';
  bucket?: string;
  cdnUrl?: string;
  maxImagesPerListing: number;
  maxImageSize: number; // MB
  maxVideoSize: number; // MB
  allowVirtualTours: boolean;
  imageFormats: string[];
  thumbnailSizes: Array<{ name: string; width: number; height: number }>;
}

export interface DeploymentConfig {
  provider: 'vercel' | 'netlify' | 'aws' | 'docker';
  environment: 'development' | 'staging' | 'production';
  domains: {
    admin?: string;
    portal: string;
    api?: string;
  };
  enableEdgeFunctions: boolean;
  enableISR: boolean;
  revalidateSeconds: number;
  staticPagesLimit: number;
}

// Combined configuration
export interface ListingPlatformConfig {
  taxonomy: TaxonomyConfig;
  platform: PlatformConfig;
  media: MediaConfig;
  deployment?: DeploymentConfig;
}

// Breadcrumb for navigation
export interface Breadcrumb {
  label: string;
  href: string;
  active?: boolean;
}

// Parsed taxonomy path from URL
export interface TaxonomyPath {
  [key: string]: string; // Dynamic keys based on taxonomy pattern
  slug: string; // Always present
}

// Listing with taxonomy data
export interface ListingWithTaxonomy {
  id: string;
  title: string;
  slug: string;
  taxonomies: Array<{
    type: string;
    term: string;
    termSlug: string;
    isPrimary: boolean;
  }>;
  // ... other listing fields
}

