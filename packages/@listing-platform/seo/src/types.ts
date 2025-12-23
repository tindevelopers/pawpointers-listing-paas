/**
 * SEO Types
 */

export interface SEOConfig {
  siteName: string;
  siteUrl: string;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultImage?: string;
  twitterHandle?: string;
  facebookAppId?: string;
  locale?: string;
}

export interface PageMeta {
  title: string;
  description: string;
  canonical?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  openGraph?: OpenGraphData;
  twitter?: TwitterCardData;
  structuredData?: StructuredDataItem[];
}

export interface OpenGraphData {
  type?: 'website' | 'article' | 'product' | 'place' | 'profile';
  title?: string;
  description?: string;
  image?: string | OpenGraphImage;
  images?: OpenGraphImage[];
  siteName?: string;
  locale?: string;
  url?: string;
}

export interface OpenGraphImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
  type?: string;
}

export interface TwitterCardData {
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
}

export interface StructuredDataItem {
  '@context': string;
  '@type': string;
  [key: string]: unknown;
}

// Schema.org types for listings
export interface ListingSchemaData {
  id: string;
  title: string;
  description?: string;
  url: string;
  images?: string[];
  price?: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  rating?: {
    average: number;
    count: number;
  };
  location?: {
    address?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
    lat?: number;
    lng?: number;
  };
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  openingHours?: string[];
  customFields?: Record<string, unknown>;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface SitemapEntry {
  url: string;
  lastModified?: Date | string;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  images?: SitemapImage[];
}

export interface SitemapImage {
  url: string;
  title?: string;
  caption?: string;
  geoLocation?: string;
  license?: string;
}

export interface RobotsTxtConfig {
  userAgent?: string;
  allow?: string[];
  disallow?: string[];
  sitemap?: string;
  crawlDelay?: number;
}

