# Configuration Guide

Comprehensive guide to configuring your Listing Platform for specific use cases.

## Table of Contents

1. [Overview](#overview)
2. [Taxonomy Configuration](#taxonomy-configuration)
3. [Field Definitions](#field-definitions)
4. [Feature Configuration](#feature-configuration)
5. [SEO Templates](#seo-templates)
6. [Deployment Configuration](#deployment-configuration)
7. [Advanced Customization](#advanced-customization)
8. [Real-World Examples](#real-world-examples)

## Overview

The Listing Platform Base uses a configuration-driven architecture, allowing you to create different types of listing platforms without code changes.

**Configuration Flow:**

```
Environment Variables → Config Loader → Taxonomy Service → App Components
```

## Taxonomy Configuration

Located in `config/taxonomies/`.

### Structure

```typescript
export const myConfig: TaxonomyConfig = {
  taxonomyType: 'industry' | 'location' | 'hybrid',
  name: string,
  description?: string,
  primaryTaxonomy: TaxonomyDefinition,
  secondaryTaxonomies?: TaxonomyDefinition[],
  listingFields: FieldDefinition[],
  enabledFeatures: {...},
  seoTemplate: SEOTemplate,
  searchConfig?: {...},
};
```

### Primary Taxonomy

The main way listings are organized:

```typescript
primaryTaxonomy: {
  name: 'profession',              // Internal name
  slug: 'profession',              // URL slug
  hierarchical: true,              // Can have parent-child relationships
  urlPattern: '/{profession}/{slug}', // URL structure
  levels: ['category', 'subcategory'], // Optional: hierarchy levels
  importance: 'primary',           // primary | high | medium | low
  labels: {
    singular: 'Profession',
    plural: 'Professions',
    all: 'All Professionals',
  },
  showInNavigation: true,          // Show in main nav
  showInFilters: true,             // Show in search filters
}
```

### URL Patterns

Define how your URLs are structured:

**Industry Directory:**
```typescript
urlPattern: '/{profession}/{slug}'
// Result: /lawyers/john-doe-law-firm
```

**Location-based:**
```typescript
urlPattern: '/{country}/{region}/{city}/{slug}'
// Result: /usa/california/san-francisco/luxury-condo
```

**Hybrid:**
```typescript
urlPattern: '/{category}/{city}/{slug}'
// Result: /restaurants/new-york/pizza-place
```

**Custom:**
```typescript
urlPattern: '/{department}/{specialty}/{slug}'
// Result: /healthcare/cardiology/dr-smith
```

### Secondary Taxonomies

Additional ways to organize/filter listings:

```typescript
secondaryTaxonomies: [
  {
    name: 'specialization',
    slug: 'specialization',
    hierarchical: false,
    urlPattern: '/specializing-in/{specialization}',
    importance: 'medium',
    labels: {
      singular: 'Specialization',
      plural: 'Specializations',
    },
    showInNavigation: false,  // Only in filters
    showInFilters: true,
  },
  // Add more as needed
]
```

## Field Definitions

Custom fields for your listings:

### Basic Field Structure

```typescript
{
  key: 'field_name',           // Unique identifier
  label: 'Display Name',       // User-facing label
  type: 'text',                // Field type (see below)
  required: false,             // Is field required?
  searchable: false,           // Include in search index?
  filterable: false,           // Show as filter option?
  displayInCard: false,        // Show in listing cards?
  placeholder: '',             // Placeholder text
  helpText: '',                // Help text for users
  options: [],                 // For select/multiselect
  validation: {},              // Validation rules
  defaultValue: null,          // Default value
}
```

### Available Field Types

#### Text Fields

```typescript
// Single line text
{ key: 'company_name', label: 'Company Name', type: 'text' }

// Multi-line rich text
{ key: 'bio', label: 'Biography', type: 'rich_text' }

// Email with validation
{ key: 'email', label: 'Email', type: 'email' }

// Phone number
{ key: 'phone', label: 'Phone', type: 'phone' }

// URL with validation
{ key: 'website', label: 'Website', type: 'url' }
```

#### Numeric Fields

```typescript
{
  key: 'years_experience',
  label: 'Years of Experience',
  type: 'number',
  validation: {
    min: 0,
    max: 100,
    message: 'Must be between 0 and 100 years',
  },
}
```

#### Selection Fields

```typescript
// Single selection
{
  key: 'pricing_model',
  label: 'Pricing Model',
  type: 'select',
  options: [
    { value: 'hourly', label: 'Hourly Rate' },
    { value: 'flat', label: 'Flat Fee' },
    { value: 'negotiable', label: 'Negotiable' },
  ],
}

// Multiple selections
{
  key: 'services',
  label: 'Services Offered',
  type: 'multiselect',
  options: [
    { value: 'consultation', label: 'Consultation' },
    { value: 'full_service', label: 'Full Service' },
  ],
}
```

#### Boolean Fields

```typescript
{
  key: 'accepts_new_clients',
  label: 'Accepting New Clients',
  type: 'boolean',
  defaultValue: true,
}
```

#### Date Fields

```typescript
// Date only
{ key: 'established_date', label: 'Established Date', type: 'date' }

// Date and time
{ key: 'event_start', label: 'Event Start', type: 'datetime' }
```

#### Location Fields

```typescript
// Single location
{ key: 'office_location', label: 'Office Location', type: 'location' }

// Multiple locations/service areas
{ key: 'service_areas', label: 'Service Areas', type: 'location_multi' }
```

#### Media Fields

```typescript
// File upload
{ key: 'resume', label: 'Resume/CV', type: 'file' }

// Image upload
{ key: 'logo', label: 'Company Logo', type: 'image' }
```

### Validation Rules

```typescript
{
  key: 'price',
  label: 'Price',
  type: 'number',
  required: true,
  validation: {
    min: 0,
    max: 1000000,
    message: 'Price must be between $0 and $1,000,000',
  },
}

{
  key: 'tagline',
  label: 'Tagline',
  type: 'text',
  validation: {
    max: 100,
    pattern: '^[a-zA-Z0-9\\s]+$',
    message: 'Only letters, numbers, and spaces allowed (max 100 characters)',
  },
}
```

### Example: Real Estate Fields

```typescript
listingFields: [
  {
    key: 'property_type',
    label: 'Property Type',
    type: 'select',
    required: true,
    filterable: true,
    displayInCard: true,
    options: [
      { value: 'house', label: 'House' },
      { value: 'condo', label: 'Condo' },
      { value: 'townhouse', label: 'Townhouse' },
      { value: 'land', label: 'Land' },
    ],
  },
  {
    key: 'bedrooms',
    label: 'Bedrooms',
    type: 'number',
    filterable: true,
    displayInCard: true,
    validation: { min: 0, max: 50 },
  },
  {
    key: 'bathrooms',
    label: 'Bathrooms',
    type: 'number',
    filterable: true,
    displayInCard: true,
    validation: { min: 0, max: 50 },
  },
  {
    key: 'square_feet',
    label: 'Square Feet',
    type: 'number',
    filterable: true,
    displayInCard: true,
  },
  {
    key: 'amenities',
    label: 'Amenities',
    type: 'multiselect',
    filterable: true,
    options: [
      { value: 'pool', label: 'Pool' },
      { value: 'gym', label: 'Gym' },
      { value: 'parking', label: 'Parking' },
      { value: 'balcony', label: 'Balcony' },
    ],
  },
]
```

## Feature Configuration

Located in `config/features.config.ts`.

### SDK Features

Enable/disable major features:

```typescript
sdks: {
  reviews: {
    enabled: true,
    config: {
      requireVerification: false,    // Must verify purchase/booking
      allowPhotos: true,
      maxPhotosPerReview: 5,
      moderationMode: 'auto',        // 'auto' | 'manual' | 'none'
      autoApproveThreshold: 3,       // Star rating threshold
      allowOwnerResponse: true,
      showHelpfulVotes: true,
    },
  },
  
  maps: {
    enabled: true,
    provider: 'mapbox',              // 'mapbox' | 'google' | 'openstreetmap'
    config: {
      apiKey: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
      defaultZoom: 12,
      clustering: true,
      enableDirections: true,
    },
  },
  
  booking: {
    enabled: false,                  // Enable for tourism/rentals
    config: {
      allowInstantBooking: true,
      requireApproval: false,
      enableWaitlist: true,
      paymentProcessor: 'stripe',
      cancellationWindow: 24,        // hours
    },
  },
}
```

### Platform Features

```typescript
platform: {
  multiTenant: true,
  allowUserListings: true,           // Users can create listings
  requireVerification: false,         // Require ID verification
  enableMessaging: true,              // User-to-user chat
  enableSavedListings: true,          // Favorites/bookmarks
  enableAlerts: true,                 // Search alerts
  enableComparison: true,             // Compare listings
  maxComparisons: 3,
}
```

### Media Configuration

```typescript
media: {
  storage: 'wasabi',                  // 'wasabi' | 's3' | 'cloudinary'
  maxImagesPerListing: 20,
  maxImageSize: 10,                   // MB
  allowVirtualTours: true,
  generateThumbnails: true,
  compressImages: true,
  thumbnailSizes: [
    { name: 'small', width: 320, height: 240 },
    { name: 'medium', width: 640, height: 480 },
    { name: 'large', width: 1280, height: 960 },
  ],
}
```

## SEO Templates

Define how metadata is generated:

```typescript
seoTemplate: {
  titlePattern: '{business_name} - {profession} | {site_name}',
  descriptionPattern: 'Find {business_name}, a professional {profession} with {years_experience} years of experience. {tagline}',
  schemaType: 'ProfessionalService',
  additionalMeta: {
    'og:type': 'business.business',
  },
}
```

### Available Placeholders

- `{title}` - Listing title
- `{description}` - Listing description
- `{excerpt}` - Short description
- `{site_name}` - Site name from env
- Any custom field: `{bedrooms}`, `{years_experience}`, etc.
- Taxonomy terms: `{profession}`, `{city}`, `{category}`, etc.

### Schema.org Types

Common types:
- `ProfessionalService` - Professional services
- `Residence` - Properties, homes
- `Product` - General products
- `TouristAttraction` - Tourism activities
- `Event` - Events, classes
- `LocalBusiness` - Local businesses
- `Attorney` - Legal services
- `Physician` - Healthcare

## Real-World Examples

### Example 1: Legal Directory

```typescript
// config/taxonomies/legal.config.ts
export const legalConfig: TaxonomyConfig = {
  taxonomyType: 'industry',
  name: 'Legal Directory',
  
  primaryTaxonomy: {
    name: 'practice_area',
    slug: 'practice-area',
    hierarchical: true,
    urlPattern: '/{practice_area}/{slug}',
    labels: {
      singular: 'Practice Area',
      plural: 'Practice Areas',
      all: 'All Attorneys',
    },
  },
  
  listingFields: [
    {
      key: 'firm_name',
      label: 'Law Firm',
      type: 'text',
      required: true,
      searchable: true,
    },
    {
      key: 'bar_admissions',
      label: 'Bar Admissions',
      type: 'multiselect',
      required: true,
      options: [
        { value: 'ny', label: 'New York' },
        { value: 'ca', label: 'California' },
        // ... all states
      ],
    },
    {
      key: 'years_practicing',
      label: 'Years Practicing',
      type: 'number',
      filterable: true,
      displayInCard: true,
    },
    {
      key: 'consultation_fee',
      label: 'Consultation Fee',
      type: 'number',
      displayInCard: true,
    },
    {
      key: 'case_types',
      label: 'Case Types',
      type: 'multiselect',
      options: [
        { value: 'divorce', label: 'Divorce' },
        { value: 'custody', label: 'Child Custody' },
        { value: 'criminal', label: 'Criminal Defense' },
      ],
    },
  ],
  
  enabledFeatures: {
    reviews: true,
    booking: false,               // Use inquiry instead
    maps: true,                   // Office location
    inquiry: true,
    comparison: true,
  },
  
  seoTemplate: {
    titlePattern: '{firm_name} - {practice_area} Attorney | LegalDir',
    descriptionPattern: '{firm_name} specializes in {practice_area} with {years_practicing} years of experience. Contact for a consultation.',
    schemaType: 'Attorney',
  },
};
```

### Example 2: Vacation Rentals

```typescript
// config/taxonomies/vacation-rentals.config.ts
export const vacationRentalsConfig: TaxonomyConfig = {
  taxonomyType: 'location',
  name: 'Vacation Rentals',
  
  primaryTaxonomy: {
    name: 'geography',
    slug: 'geography',
    hierarchical: true,
    urlPattern: '/{country}/{region}/{city}/{slug}',
    levels: ['country', 'region', 'city'],
  },
  
  listingFields: [
    {
      key: 'property_name',
      label: 'Property Name',
      type: 'text',
      required: true,
    },
    {
      key: 'bedrooms',
      label: 'Bedrooms',
      type: 'number',
      required: true,
      filterable: true,
      displayInCard: true,
    },
    {
      key: 'max_guests',
      label: 'Maximum Guests',
      type: 'number',
      required: true,
      filterable: true,
    },
    {
      key: 'nightly_rate',
      label: 'Nightly Rate',
      type: 'number',
      required: true,
      displayInCard: true,
    },
    {
      key: 'minimum_stay',
      label: 'Minimum Stay (nights)',
      type: 'number',
      defaultValue: 1,
    },
    {
      key: 'amenities',
      label: 'Amenities',
      type: 'multiselect',
      options: [
        { value: 'wifi', label: 'WiFi' },
        { value: 'kitchen', label: 'Full Kitchen' },
        { value: 'ac', label: 'Air Conditioning' },
        { value: 'pool', label: 'Pool' },
        { value: 'parking', label: 'Free Parking' },
      ],
    },
  ],
  
  enabledFeatures: {
    reviews: true,
    booking: true,                // Essential for rentals
    maps: true,
    virtualTour: true,            // 3D tours
    comparison: true,
  },
  
  seoTemplate: {
    titlePattern: '{property_name} - {bedrooms} BR Vacation Rental in {city}',
    descriptionPattern: 'Book {property_name}, a {bedrooms} bedroom vacation rental in {city}, {region}. Sleeps {max_guests}. ${nightly_rate}/night.',
    schemaType: 'TouristAttraction',
  },
};
```

## Advanced Customization

### Custom Validation Functions

For complex validation:

```typescript
// packages/@listing-platform/config/src/validators.ts
export function validateListingData(listing: any, config: TaxonomyConfig): ValidationResult {
  const errors: string[] = [];
  
  // Custom business logic
  if (listing.price > 1000000 && !listing.luxury_certified) {
    errors.push('Properties over $1M require luxury certification');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### Dynamic Field Options

Load options from database:

```typescript
{
  key: 'profession',
  label: 'Profession',
  type: 'select',
  options: async () => {
    // Fetch from database
    const professions = await getProfessions();
    return professions.map(p => ({
      value: p.slug,
      label: p.name,
    }));
  },
}
```

### Conditional Fields

Show fields based on other field values:

```typescript
{
  key: 'consultation_fee',
  label: 'Consultation Fee',
  type: 'number',
  showIf: (values) => values.offers_consultation === true,
}
```

## Next Steps

- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [API Documentation](./API.md)

