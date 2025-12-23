/**
 * Meta Tags Component
 * Renders meta tags for pages (for use with pages router or custom implementations)
 */

import React from 'react';
import type { PageMeta } from '../types';

export interface MetaTagsProps {
  meta: PageMeta;
  siteUrl?: string;
}

/**
 * MetaTags Component
 * Renders all necessary meta tags for SEO
 * 
 * Note: For Next.js App Router, prefer using the Metadata API.
 * This component is useful for Pages Router or custom implementations.
 * 
 * @example
 * ```tsx
 * <MetaTags meta={{
 *   title: "My Page",
 *   description: "Page description",
 *   openGraph: { ... },
 * }} />
 * ```
 */
export function MetaTags({ meta, siteUrl }: MetaTagsProps) {
  return (
    <>
      {/* Basic Meta Tags */}
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      
      {/* Canonical URL */}
      {meta.canonical && <link rel="canonical" href={meta.canonical} />}
      
      {/* Robots */}
      {(meta.noIndex || meta.noFollow) && (
        <meta
          name="robots"
          content={[
            meta.noIndex ? 'noindex' : 'index',
            meta.noFollow ? 'nofollow' : 'follow',
          ].join(', ')}
        />
      )}
      
      {/* Open Graph */}
      {meta.openGraph && (
        <>
          <meta property="og:type" content={meta.openGraph.type || 'website'} />
          {meta.openGraph.title && (
            <meta property="og:title" content={meta.openGraph.title} />
          )}
          {meta.openGraph.description && (
            <meta property="og:description" content={meta.openGraph.description} />
          )}
          {meta.openGraph.url && (
            <meta property="og:url" content={meta.openGraph.url} />
          )}
          {meta.openGraph.siteName && (
            <meta property="og:site_name" content={meta.openGraph.siteName} />
          )}
          {meta.openGraph.locale && (
            <meta property="og:locale" content={meta.openGraph.locale} />
          )}
          {meta.openGraph.image && (
            typeof meta.openGraph.image === 'string' ? (
              <meta property="og:image" content={meta.openGraph.image} />
            ) : (
              <>
                <meta property="og:image" content={meta.openGraph.image.url} />
                {meta.openGraph.image.width && (
                  <meta property="og:image:width" content={String(meta.openGraph.image.width)} />
                )}
                {meta.openGraph.image.height && (
                  <meta property="og:image:height" content={String(meta.openGraph.image.height)} />
                )}
                {meta.openGraph.image.alt && (
                  <meta property="og:image:alt" content={meta.openGraph.image.alt} />
                )}
              </>
            )
          )}
        </>
      )}
      
      {/* Twitter Card */}
      {meta.twitter && (
        <>
          <meta
            name="twitter:card"
            content={meta.twitter.card || 'summary_large_image'}
          />
          {meta.twitter.site && (
            <meta name="twitter:site" content={meta.twitter.site} />
          )}
          {meta.twitter.creator && (
            <meta name="twitter:creator" content={meta.twitter.creator} />
          )}
          {meta.twitter.title && (
            <meta name="twitter:title" content={meta.twitter.title} />
          )}
          {meta.twitter.description && (
            <meta name="twitter:description" content={meta.twitter.description} />
          )}
          {meta.twitter.image && (
            <meta name="twitter:image" content={meta.twitter.image} />
          )}
          {meta.twitter.imageAlt && (
            <meta name="twitter:image:alt" content={meta.twitter.imageAlt} />
          )}
        </>
      )}
    </>
  );
}

/**
 * Generate meta tags as HTML string for SSR
 */
export function generateMetaTagsHtml(meta: PageMeta): string {
  const tags: string[] = [];
  
  // Basic meta tags
  tags.push(`<title>${escapeHtml(meta.title)}</title>`);
  tags.push(`<meta name="description" content="${escapeHtml(meta.description)}" />`);
  
  // Canonical
  if (meta.canonical) {
    tags.push(`<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`);
  }
  
  // Robots
  if (meta.noIndex || meta.noFollow) {
    const content = [
      meta.noIndex ? 'noindex' : 'index',
      meta.noFollow ? 'nofollow' : 'follow',
    ].join(', ');
    tags.push(`<meta name="robots" content="${content}" />`);
  }
  
  // Open Graph
  if (meta.openGraph) {
    const og = meta.openGraph;
    tags.push(`<meta property="og:type" content="${og.type || 'website'}" />`);
    if (og.title) tags.push(`<meta property="og:title" content="${escapeHtml(og.title)}" />`);
    if (og.description) tags.push(`<meta property="og:description" content="${escapeHtml(og.description)}" />`);
    if (og.url) tags.push(`<meta property="og:url" content="${escapeHtml(og.url)}" />`);
    if (og.siteName) tags.push(`<meta property="og:site_name" content="${escapeHtml(og.siteName)}" />`);
    if (og.image) {
      const imgUrl = typeof og.image === 'string' ? og.image : og.image.url;
      tags.push(`<meta property="og:image" content="${escapeHtml(imgUrl)}" />`);
    }
  }
  
  // Twitter
  if (meta.twitter) {
    const tw = meta.twitter;
    tags.push(`<meta name="twitter:card" content="${tw.card || 'summary_large_image'}" />`);
    if (tw.site) tags.push(`<meta name="twitter:site" content="${escapeHtml(tw.site)}" />`);
    if (tw.title) tags.push(`<meta name="twitter:title" content="${escapeHtml(tw.title)}" />`);
    if (tw.description) tags.push(`<meta name="twitter:description" content="${escapeHtml(tw.description)}" />`);
    if (tw.image) tags.push(`<meta name="twitter:image" content="${escapeHtml(tw.image)}" />`);
  }
  
  return tags.join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default MetaTags;

