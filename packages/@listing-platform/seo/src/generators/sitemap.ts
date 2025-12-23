/**
 * Sitemap Generator
 * Generates XML sitemaps for Next.js applications
 */

import type { SitemapEntry, SitemapImage } from '../types';

export interface SitemapGeneratorConfig {
  baseUrl: string;
  defaultChangeFrequency?: SitemapEntry['changeFrequency'];
  defaultPriority?: number;
}

/**
 * Sitemap Generator for listing platforms
 */
export class SitemapGenerator {
  private config: SitemapGeneratorConfig;
  private entries: SitemapEntry[] = [];
  
  constructor(config: SitemapGeneratorConfig) {
    this.config = {
      defaultChangeFrequency: 'weekly',
      defaultPriority: 0.5,
      ...config,
    };
  }
  
  /**
   * Add a single entry to the sitemap
   */
  addEntry(entry: Omit<SitemapEntry, 'url'> & { path: string }): this {
    const url = `${this.config.baseUrl}${entry.path}`;
    this.entries.push({
      url,
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency || this.config.defaultChangeFrequency,
      priority: entry.priority ?? this.config.defaultPriority,
      images: entry.images,
    });
    return this;
  }
  
  /**
   * Add multiple entries
   */
  addEntries(entries: Array<Omit<SitemapEntry, 'url'> & { path: string }>): this {
    entries.forEach(entry => this.addEntry(entry));
    return this;
  }
  
  /**
   * Add listing entries with automatic path generation
   */
  addListings(
    listings: Array<{
      slug: string;
      taxonomyPath?: string;
      updatedAt?: string | Date;
      images?: string[];
    }>,
    options?: {
      priority?: number;
      changeFrequency?: SitemapEntry['changeFrequency'];
    }
  ): this {
    listings.forEach(listing => {
      const path = listing.taxonomyPath 
        ? `/${listing.taxonomyPath}/${listing.slug}`
        : `/listings/${listing.slug}`;
      
      const images: SitemapImage[] | undefined = listing.images?.map(url => ({
        url,
      }));
      
      this.addEntry({
        path,
        lastModified: listing.updatedAt,
        priority: options?.priority ?? 0.7,
        changeFrequency: options?.changeFrequency ?? 'weekly',
        images,
      });
    });
    
    return this;
  }
  
  /**
   * Add taxonomy term entries
   */
  addTaxonomyTerms(
    terms: Array<{
      slug: string;
      parentSlug?: string;
      listingCount?: number;
    }>,
    options?: {
      basePriority?: number;
      changeFrequency?: SitemapEntry['changeFrequency'];
    }
  ): this {
    const basePriority = options?.basePriority ?? 0.6;
    
    terms.forEach(term => {
      const path = term.parentSlug 
        ? `/${term.parentSlug}/${term.slug}`
        : `/${term.slug}`;
      
      // Boost priority for terms with more listings
      const priority = term.listingCount 
        ? Math.min(basePriority + (term.listingCount / 1000) * 0.2, 0.9)
        : basePriority;
      
      this.addEntry({
        path,
        priority,
        changeFrequency: options?.changeFrequency ?? 'daily',
      });
    });
    
    return this;
  }
  
  /**
   * Add static pages
   */
  addStaticPages(
    pages: string[],
    options?: {
      priority?: number;
      changeFrequency?: SitemapEntry['changeFrequency'];
    }
  ): this {
    pages.forEach(path => {
      this.addEntry({
        path,
        priority: options?.priority ?? 0.8,
        changeFrequency: options?.changeFrequency ?? 'monthly',
      });
    });
    
    return this;
  }
  
  /**
   * Get all entries (for Next.js sitemap.ts)
   */
  getEntries(): SitemapEntry[] {
    return this.entries;
  }
  
  /**
   * Generate Next.js sitemap format
   */
  toNextSitemap(): Array<{
    url: string;
    lastModified?: Date | string;
    changeFrequency?: string;
    priority?: number;
  }> {
    return this.entries.map(entry => ({
      url: entry.url,
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    }));
  }
  
  /**
   * Generate XML string (for custom sitemap endpoints)
   */
  toXML(): string {
    const urlEntries = this.entries.map(entry => {
      let xml = `  <url>\n    <loc>${escapeXml(entry.url)}</loc>`;
      
      if (entry.lastModified) {
        const date = entry.lastModified instanceof Date 
          ? entry.lastModified.toISOString()
          : entry.lastModified;
        xml += `\n    <lastmod>${date}</lastmod>`;
      }
      
      if (entry.changeFrequency) {
        xml += `\n    <changefreq>${entry.changeFrequency}</changefreq>`;
      }
      
      if (entry.priority !== undefined) {
        xml += `\n    <priority>${entry.priority.toFixed(1)}</priority>`;
      }
      
      // Add image entries
      if (entry.images && entry.images.length > 0) {
        entry.images.forEach(image => {
          xml += `\n    <image:image>`;
          xml += `\n      <image:loc>${escapeXml(image.url)}</image:loc>`;
          if (image.title) {
            xml += `\n      <image:title>${escapeXml(image.title)}</image:title>`;
          }
          if (image.caption) {
            xml += `\n      <image:caption>${escapeXml(image.caption)}</image:caption>`;
          }
          xml += `\n    </image:image>`;
        });
      }
      
      xml += '\n  </url>';
      return xml;
    }).join('\n');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries}
</urlset>`;
  }
  
  /**
   * Generate sitemap index for large sites
   */
  static generateSitemapIndex(
    sitemaps: Array<{ url: string; lastModified?: string | Date }>
  ): string {
    const entries = sitemaps.map(sitemap => {
      let xml = `  <sitemap>\n    <loc>${escapeXml(sitemap.url)}</loc>`;
      if (sitemap.lastModified) {
        const date = sitemap.lastModified instanceof Date 
          ? sitemap.lastModified.toISOString()
          : sitemap.lastModified;
        xml += `\n    <lastmod>${date}</lastmod>`;
      }
      xml += '\n  </sitemap>';
      return xml;
    }).join('\n');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

