/**
 * Meta Tag Utilities
 */

import type { PageMeta, SEOConfig, OpenGraphData, TwitterCardData } from '../types';

/**
 * Generate complete page metadata for Next.js
 */
export function generatePageMeta(
  meta: Partial<PageMeta>,
  config: SEOConfig
): PageMeta {
  const title = meta.title || config.defaultTitle || config.siteName;
  const description = meta.description || config.defaultDescription || '';
  
  return {
    title,
    description,
    canonical: meta.canonical,
    noIndex: meta.noIndex,
    noFollow: meta.noFollow,
    openGraph: generateOpenGraph(
      { title, description, ...meta.openGraph },
      config
    ),
    twitter: generateTwitterCard(
      { title, description, ...meta.twitter },
      config
    ),
    structuredData: meta.structuredData,
  };
}

/**
 * Generate Open Graph metadata
 */
export function generateOpenGraph(
  data: Partial<OpenGraphData>,
  config: SEOConfig
): OpenGraphData {
  return {
    type: data.type || 'website',
    title: data.title || config.defaultTitle,
    description: data.description || config.defaultDescription,
    siteName: data.siteName || config.siteName,
    locale: data.locale || config.locale || 'en_US',
    url: data.url,
    image: data.image || config.defaultImage,
    images: data.images,
  };
}

/**
 * Generate Twitter Card metadata
 */
export function generateTwitterCard(
  data: Partial<TwitterCardData>,
  config: SEOConfig
): TwitterCardData {
  return {
    card: data.card || 'summary_large_image',
    site: data.site || config.twitterHandle,
    creator: data.creator || config.twitterHandle,
    title: data.title || config.defaultTitle,
    description: data.description || config.defaultDescription,
    image: data.image || config.defaultImage,
    imageAlt: data.imageAlt,
  };
}

/**
 * Format title with site name
 */
export function formatTitle(
  title: string,
  siteName: string,
  separator = ' | '
): string {
  if (title === siteName) return title;
  return `${title}${separator}${siteName}`;
}

/**
 * Truncate description to SEO-friendly length
 */
export function truncateDescription(
  description: string,
  maxLength = 160
): string {
  if (description.length <= maxLength) return description;
  
  // Find the last space before maxLength
  const truncated = description.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength - 30) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Generate robots meta content
 */
export function generateRobotsMeta(
  noIndex?: boolean,
  noFollow?: boolean
): string | null {
  const directives: string[] = [];
  
  if (noIndex) directives.push('noindex');
  if (noFollow) directives.push('nofollow');
  
  if (directives.length === 0) return null;
  
  return directives.join(', ');
}

/**
 * Convert PageMeta to Next.js Metadata format
 */
export function toNextMetadata(meta: PageMeta, siteUrl: string): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    title: meta.title,
    description: meta.description,
  };
  
  if (meta.canonical) {
    metadata.alternates = { canonical: meta.canonical };
  }
  
  if (meta.noIndex || meta.noFollow) {
    metadata.robots = {
      index: !meta.noIndex,
      follow: !meta.noFollow,
    };
  }
  
  if (meta.openGraph) {
    metadata.openGraph = {
      type: meta.openGraph.type,
      title: meta.openGraph.title,
      description: meta.openGraph.description,
      siteName: meta.openGraph.siteName,
      locale: meta.openGraph.locale,
      url: meta.openGraph.url,
      images: meta.openGraph.images || (meta.openGraph.image ? [
        typeof meta.openGraph.image === 'string'
          ? { url: meta.openGraph.image }
          : meta.openGraph.image
      ] : undefined),
    };
  }
  
  if (meta.twitter) {
    metadata.twitter = {
      card: meta.twitter.card,
      site: meta.twitter.site,
      creator: meta.twitter.creator,
      title: meta.twitter.title,
      description: meta.twitter.description,
      images: meta.twitter.image ? [meta.twitter.image] : undefined,
    };
  }
  
  return metadata;
}

