/**
 * JSON-LD Structured Data Component
 * Renders Schema.org structured data in a script tag
 */

import React from 'react';
import type { StructuredDataItem } from '../types';

export interface JsonLdProps {
  data: StructuredDataItem | StructuredDataItem[];
}

/**
 * JSON-LD Component
 * Renders structured data as a script tag for SEO
 * 
 * @example
 * ```tsx
 * <JsonLd data={{
 *   "@context": "https://schema.org",
 *   "@type": "LocalBusiness",
 *   name: "My Business",
 * }} />
 * ```
 */
export function JsonLd({ data }: JsonLdProps) {
  const items = Array.isArray(data) ? data : [data];
  
  return (
    <>
      {items.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item, null, 0),
          }}
        />
      ))}
    </>
  );
}

/**
 * Multi JSON-LD Component
 * Renders multiple structured data items
 */
export function JsonLdMultiple({ items }: { items: StructuredDataItem[] }) {
  return <JsonLd data={items} />;
}

/**
 * Create JSON-LD script string for server-side rendering
 */
export function createJsonLdString(data: StructuredDataItem | StructuredDataItem[]): string {
  const items = Array.isArray(data) ? data : [data];
  
  return items
    .map(item => `<script type="application/ld+json">${JSON.stringify(item)}</script>`)
    .join('\n');
}

export default JsonLd;

