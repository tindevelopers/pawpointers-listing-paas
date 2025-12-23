# @listing-platform/seo

SEO utilities and components for listing platforms. Generate structured data, sitemaps, meta tags, and more.

## Features

- **JSON-LD Structured Data** - Schema.org structured data for listings
- **Sitemap Generation** - Dynamic sitemap generation for listings and taxonomy pages
- **Meta Tag Helpers** - Generate complete page metadata for SEO
- **Robots.txt Generator** - Configurable robots.txt generation
- **Multiple Schema Types** - Support for LocalBusiness, Product, RealEstate, Event, and more

## Installation

```bash
pnpm add @listing-platform/seo
```

## Usage

### JSON-LD Structured Data

```tsx
import { JsonLd, generateListingSchema } from '@listing-platform/seo';

// In your listing page
export default function ListingPage({ listing }) {
  const schema = generateListingSchema({
    id: listing.id,
    title: listing.title,
    description: listing.description,
    url: `https://example.com/listings/${listing.slug}`,
    images: listing.images,
    rating: {
      average: listing.ratingAverage,
      count: listing.reviewCount,
    },
    location: listing.location,
  }, 'LocalBusiness');

  return (
    <>
      <JsonLd data={schema} />
      {/* Page content */}
    </>
  );
}
```

### Meta Tags Generator

```tsx
import { MetaTagGenerator } from '@listing-platform/seo';

const metaGenerator = new MetaTagGenerator({
  siteName: 'My Listings',
  siteUrl: 'https://example.com',
  defaultDescription: 'Find the best listings',
  twitterHandle: '@mylistings',
});

// For a listing page
const meta = metaGenerator.forListing({
  id: 'listing-123',
  title: 'Awesome Listing',
  description: 'This is an awesome listing',
  url: 'https://example.com/listings/awesome-listing',
  images: ['https://example.com/image.jpg'],
});

// Convert to Next.js Metadata format
export const metadata = toNextMetadata(meta, 'https://example.com');
```

### Sitemap Generation

```tsx
// app/sitemap.ts
import { SitemapGenerator } from '@listing-platform/seo';

export default async function sitemap() {
  const generator = new SitemapGenerator({
    baseUrl: 'https://example.com',
  });

  // Add static pages
  generator.addStaticPages(['/', '/about', '/contact']);

  // Add listings
  const listings = await getListings();
  generator.addListings(listings.map(l => ({
    slug: l.slug,
    taxonomyPath: l.category,
    updatedAt: l.updatedAt,
    images: l.images,
  })));

  // Add taxonomy terms
  const categories = await getCategories();
  generator.addTaxonomyTerms(categories.map(c => ({
    slug: c.slug,
    listingCount: c.count,
  })));

  return generator.toNextSitemap();
}
```

### Robots.txt Generation

```tsx
// app/robots.ts
import { RobotsTxtGenerator } from '@listing-platform/seo';

export default function robots() {
  const generator = RobotsTxtGenerator.production('https://example.com');
  return generator.toNextRobots();
}
```

## Schema Types

The package supports multiple Schema.org types:

- `LocalBusiness` - For local businesses and services
- `ProfessionalService` - For professional services (lawyers, doctors, etc.)
- `Product` - For e-commerce listings
- `RealEstateListing` - For real estate properties
- `Event` - For events and activities
- `Organization` - For organizations
- `WebSite` - For website-level schema with search action

## API Reference

### Generators

- `SitemapGenerator` - Generate XML sitemaps
- `RobotsTxtGenerator` - Generate robots.txt files
- `MetaTagGenerator` - Generate page metadata

### Components

- `JsonLd` - Render JSON-LD structured data
- `MetaTags` - Render meta tags (for Pages Router)

### Utilities

- `generateListingSchema()` - Generate schema for a listing
- `generateBreadcrumbSchema()` - Generate breadcrumb schema
- `generateOrganizationSchema()` - Generate organization schema
- `generateWebSiteSchema()` - Generate website schema
- `formatTitle()` - Format page title with site name
- `truncateDescription()` - Truncate description for SEO

## License

MIT

