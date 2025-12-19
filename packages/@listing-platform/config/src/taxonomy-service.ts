import type { 
  TaxonomyConfig, 
  TaxonomyPath, 
  Breadcrumb, 
  FieldDefinition,
  ListingWithTaxonomy 
} from './types';

/**
 * TaxonomyService - Central service for managing taxonomy configuration
 * Handles URL parsing, breadcrumb generation, and field management
 */
export class TaxonomyService {
  private config: TaxonomyConfig;

  constructor(config: TaxonomyConfig) {
    this.config = config;
  }

  /**
   * Get the full taxonomy configuration
   */
  getConfig(): TaxonomyConfig {
    return this.config;
  }

  /**
   * Get the URL pattern for the primary taxonomy
   */
  getURLPattern(): string {
    return this.config.primaryTaxonomy.urlPattern;
  }

  /**
   * Parse URL segments into taxonomy path
   * Example: ['lawyers', 'john-doe'] => { profession: 'lawyers', slug: 'john-doe' }
   * Example: ['usa', 'california', 'sf', 'property-123'] => { country: 'usa', region: 'california', city: 'sf', slug: 'property-123' }
   */
  parseURL(segments: string[]): TaxonomyPath {
    const pattern = this.config.primaryTaxonomy.urlPattern;
    const levels = this.config.primaryTaxonomy.levels || [];
    const path: TaxonomyPath = { slug: '' };

    // Extract variable names from pattern
    // E.g., "/{country}/{region}/{city}/{slug}" => ['country', 'region', 'city', 'slug']
    const variables = pattern.match(/\{(\w+)\}/g)?.map(v => v.slice(1, -1)) || [];

    // Map segments to variables
    variables.forEach((variable, index) => {
      if (index < segments.length) {
        path[variable] = segments[index];
      }
    });

    // Slug is always the last segment
    path.slug = segments[segments.length - 1];

    return path;
  }

  /**
   * Generate URL from taxonomy path
   * Example: { profession: 'lawyers', slug: 'john-doe' } => '/lawyers/john-doe'
   */
  generateURL(path: TaxonomyPath): string {
    let url = this.config.primaryTaxonomy.urlPattern;

    // Replace variables in pattern
    Object.keys(path).forEach(key => {
      url = url.replace(`{${key}}`, path[key]);
    });

    return url;
  }

  /**
   * Generate breadcrumbs from listing and taxonomy data
   */
  generateBreadcrumbs(listing: ListingWithTaxonomy): Breadcrumb[] {
    const breadcrumbs: Breadcrumb[] = [
      { label: 'Home', href: '/' }
    ];

    // Get primary taxonomy
    const primaryTaxonomy = listing.taxonomies.find(t => t.isPrimary);
    
    if (!primaryTaxonomy) {
      breadcrumbs.push({ 
        label: listing.title, 
        href: `/${listing.slug}`,
        active: true 
      });
      return breadcrumbs;
    }

    // For hierarchical taxonomies, we'd need to fetch parent terms
    // For now, add the primary term
    const taxonomyLabel = this.config.primaryTaxonomy.labels.plural;
    breadcrumbs.push({
      label: taxonomyLabel,
      href: `/${primaryTaxonomy.termSlug}`
    });

    // Add current listing
    breadcrumbs.push({
      label: listing.title,
      href: `/${primaryTaxonomy.termSlug}/${listing.slug}`,
      active: true
    });

    return breadcrumbs;
  }

  /**
   * Get required fields for listing creation
   */
  getRequiredFields(): FieldDefinition[] {
    return this.config.listingFields.filter(f => f.required);
  }

  /**
   * Get searchable fields
   */
  getSearchableFields(): FieldDefinition[] {
    return this.config.listingFields.filter(f => f.searchable);
  }

  /**
   * Get filterable fields
   */
  getFilterableFields(): FieldDefinition[] {
    return this.config.listingFields.filter(f => f.filterable);
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof TaxonomyConfig['enabledFeatures']): boolean {
    return this.config.enabledFeatures[feature] === true;
  }

  /**
   * Get SEO metadata template
   */
  getSEOTemplate() {
    return this.config.seoTemplate;
  }

  /**
   * Generate SEO title from template and listing data
   */
  generateSEOTitle(listing: any, additionalData?: Record<string, string>): string {
    let title = this.config.seoTemplate.titlePattern;
    
    // Replace variables
    const data = { ...listing, ...listing.custom_fields, ...additionalData };
    Object.keys(data).forEach(key => {
      title = title.replace(`{${key}}`, data[key] || '');
    });

    return title;
  }

  /**
   * Generate SEO description from template and listing data
   */
  generateSEODescription(listing: any, additionalData?: Record<string, string>): string {
    let description = this.config.seoTemplate.descriptionPattern;
    
    const data = { ...listing, ...listing.custom_fields, ...additionalData };
    Object.keys(data).forEach(key => {
      description = description.replace(`{${key}}`, data[key] || '');
    });

    // Truncate if too long
    if (description.length > 160) {
      description = description.substring(0, 157) + '...';
    }

    return description;
  }

  /**
   * Validate listing fields against configuration
   */
  validateFields(customFields: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    this.getRequiredFields().forEach(field => {
      if (!customFields[field.key]) {
        errors.push(`${field.label} is required`);
      }
    });

    // Type validation (basic)
    this.config.listingFields.forEach(field => {
      const value = customFields[field.key];
      if (value === undefined || value === null) return;

      switch (field.type) {
        case 'number':
          if (typeof value !== 'number' && isNaN(Number(value))) {
            errors.push(`${field.label} must be a number`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`${field.label} must be true or false`);
          }
          break;
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push(`${field.label} must be a valid email`);
          }
          break;
        // Add more validation as needed
      }

      // Validation rules
      if (field.validation) {
        const { min, max, pattern } = field.validation;
        
        if (min !== undefined && Number(value) < min) {
          errors.push(field.validation.message || `${field.label} must be at least ${min}`);
        }
        if (max !== undefined && Number(value) > max) {
          errors.push(field.validation.message || `${field.label} must be at most ${max}`);
        }
        if (pattern && !new RegExp(pattern).test(value)) {
          errors.push(field.validation.message || `${field.label} format is invalid`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get default search configuration
   */
  getSearchConfig() {
    return this.config.searchConfig || {
      defaultSort: 'relevance' as const,
      allowedSorts: ['relevance', 'date', 'price', 'rating'],
      resultsPerPage: 20,
      enableFuzzySearch: true
    };
  }
}

// Singleton instance management
let instance: TaxonomyService | null = null;

export function initTaxonomyService(config: TaxonomyConfig): TaxonomyService {
  instance = new TaxonomyService(config);
  return instance;
}

export function getTaxonomyService(): TaxonomyService {
  if (!instance) {
    throw new Error('TaxonomyService not initialized. Call initTaxonomyService first.');
  }
  return instance;
}

