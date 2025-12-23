/**
 * Meta Tags Generator
 * Generates meta tags for server-side rendering
 */

import type { PageMeta, SEOConfig, ListingSchemaData } from '../types';
import { generatePageMeta, formatTitle, truncateDescription } from '../utils/meta';
import { generateListingSchema, generateBreadcrumbSchema, type BreadcrumbItem } from '../utils/schema';

export interface MetaTagGeneratorConfig extends SEOConfig {
  schemaType?: string;
}

/**
 * Meta Tag Generator for listing platforms
 */
export class MetaTagGenerator {
  private config: MetaTagGeneratorConfig;
  
  constructor(config: MetaTagGeneratorConfig) {
    this.config = config;
  }
  
  /**
   * Generate meta tags for a listing page
   */
  forListing(
    listing: ListingSchemaData,
    options?: {
      breadcrumbs?: BreadcrumbItem[];
      schemaType?: string;
    }
  ): PageMeta {
    const url = listing.url || `${this.config.siteUrl}/listings/${listing.id}`;
    
    const title = formatTitle(listing.title, this.config.siteName);
    const description = truncateDescription(listing.description || '');
    
    const structuredData = [
      generateListingSchema(
        listing,
        options?.schemaType || this.config.schemaType || 'LocalBusiness'
      ),
    ];
    
    // Add breadcrumb schema if provided
    if (options?.breadcrumbs && options.breadcrumbs.length > 0) {
      structuredData.push(generateBreadcrumbSchema(options.breadcrumbs));
    }
    
    return generatePageMeta(
      {
        title,
        description,
        canonical: url,
        openGraph: {
          type: 'website',
          title: listing.title,
          description,
          url,
          image: listing.images?.[0],
          images: listing.images?.map(img => ({ url: img })),
        },
        twitter: {
          title: listing.title,
          description,
          image: listing.images?.[0],
        },
        structuredData,
      },
      this.config
    );
  }
  
  /**
   * Generate meta tags for a category/taxonomy page
   */
  forCategory(
    category: {
      name: string;
      description?: string;
      slug: string;
      image?: string;
      listingCount?: number;
    },
    options?: {
      breadcrumbs?: BreadcrumbItem[];
    }
  ): PageMeta {
    const url = `${this.config.siteUrl}/${category.slug}`;
    
    const title = formatTitle(
      category.name,
      this.config.siteName
    );
    
    const defaultDescription = `Browse ${category.listingCount || ''} ${category.name.toLowerCase()} listings`;
    const description = truncateDescription(category.description || defaultDescription);
    
    const structuredData = [];
    
    // Add breadcrumb schema if provided
    if (options?.breadcrumbs && options.breadcrumbs.length > 0) {
      structuredData.push(generateBreadcrumbSchema(options.breadcrumbs));
    }
    
    return generatePageMeta(
      {
        title,
        description,
        canonical: url,
        openGraph: {
          type: 'website',
          title: category.name,
          description,
          url,
          image: category.image,
        },
        twitter: {
          title: category.name,
          description,
          image: category.image,
        },
        structuredData,
      },
      this.config
    );
  }
  
  /**
   * Generate meta tags for search results page
   */
  forSearch(
    query: string,
    options?: {
      totalResults?: number;
      filters?: Record<string, string>;
    }
  ): PageMeta {
    const title = query 
      ? formatTitle(`Search: ${query}`, this.config.siteName)
      : formatTitle('Search', this.config.siteName);
    
    const description = options?.totalResults !== undefined
      ? `Found ${options.totalResults} results for "${query}"`
      : `Search listings on ${this.config.siteName}`;
    
    return generatePageMeta(
      {
        title,
        description,
        noIndex: true, // Search pages usually shouldn't be indexed
        openGraph: {
          type: 'website',
          title,
          description,
        },
      },
      this.config
    );
  }
  
  /**
   * Generate meta tags for a static page
   */
  forPage(
    page: {
      title: string;
      description?: string;
      path: string;
      image?: string;
    }
  ): PageMeta {
    const url = `${this.config.siteUrl}${page.path}`;
    const title = formatTitle(page.title, this.config.siteName);
    const description = truncateDescription(page.description || '');
    
    return generatePageMeta(
      {
        title,
        description,
        canonical: url,
        openGraph: {
          type: 'website',
          title: page.title,
          description,
          url,
          image: page.image,
        },
        twitter: {
          title: page.title,
          description,
          image: page.image,
        },
      },
      this.config
    );
  }
  
  /**
   * Generate meta tags for homepage
   */
  forHome(options?: {
    tagline?: string;
    featuredImage?: string;
  }): PageMeta {
    const title = options?.tagline 
      ? `${this.config.siteName} - ${options.tagline}`
      : this.config.siteName;
    
    const description = this.config.defaultDescription || '';
    
    return generatePageMeta(
      {
        title,
        description,
        canonical: this.config.siteUrl,
        openGraph: {
          type: 'website',
          title,
          description,
          url: this.config.siteUrl,
          image: options?.featuredImage || this.config.defaultImage,
        },
        twitter: {
          title,
          description,
          image: options?.featuredImage || this.config.defaultImage,
        },
      },
      this.config
    );
  }
  
  /**
   * Generate meta tags for 404 page
   */
  forNotFound(): PageMeta {
    return generatePageMeta(
      {
        title: formatTitle('Page Not Found', this.config.siteName),
        description: 'The page you are looking for could not be found.',
        noIndex: true,
      },
      this.config
    );
  }
  
  /**
   * Generate meta tags for error page
   */
  forError(statusCode: number = 500): PageMeta {
    const title = statusCode === 500 
      ? 'Server Error'
      : `Error ${statusCode}`;
    
    return generatePageMeta(
      {
        title: formatTitle(title, this.config.siteName),
        description: 'An error occurred. Please try again later.',
        noIndex: true,
      },
      this.config
    );
  }
}

