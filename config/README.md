# Configuration System

This directory contains the flexible configuration system for the Listing Platform Base template.

## Overview

The configuration system allows you to:
- Choose a taxonomy type (industry, location, or hybrid)
- Define custom fields per listing type
- Configure enabled features (booking, reviews, maps, etc.)
- Set SEO templates
- Manage deployment settings

## Structure

```
config/
├── taxonomies/
│   ├── industry.config.ts    # Profession-based configuration
│   ├── location.config.ts    # Geography-based configuration
│   └── hybrid.config.ts      # Combined configuration
├── features.config.ts        # Feature flags and SDK configs
├── index.ts                  # Configuration loader
└── README.md                 # This file
```

## Taxonomy Configurations

### Industry Configuration (`industry.config.ts`)

For profession-based listings:
- URL pattern: `/{profession}/{slug}`
- Example: `/lawyers/john-doe-law-firm`
- Use cases: Professional directories, service providers
- Features: Reviews, Maps, Inquiry, Comparison

**Example professions:**
- Legal Services (Lawyers, Notaries, Mediators)
- Healthcare (Doctors, Dentists, Therapists)
- Home Services (Plumbers, Electricians, Contractors)
- Pet Services (Veterinarians, Groomers, Trainers)

### Location Configuration (`location.config.ts`)

For geography-first listings:
- URL pattern: `/{country}/{region}/{city}/{slug}`
- Example: `/usa/california/san-francisco/luxury-condo-123`
- Use cases: Real estate, tourism, local businesses
- Features: Reviews, Booking, Maps, Virtual Tours

**Example categories:**
- Real Estate (For Sale, For Rent, Commercial)
- Tourism (Hotels, Attractions, Tours)
- Events (Concerts, Festivals, Conferences)

### Hybrid Configuration (`hybrid.config.ts`)

For combined category + location:
- URL pattern: `/{category}/{city}/{slug}`
- Example: `/water-sports/miami/jet-ski-rental`
- Use cases: Activities, events, location-based services
- Features: All features enabled

**Example categories:**
- Tourism Activities (Water Sports, Hiking, Tours)
- Events (Concerts, Workshops, Meetups)
- Services by Location (Gyms, Restaurants, Spa)

## Choosing a Configuration

Set the `TAXONOMY_CONFIG` environment variable:

```bash
# .env.local
TAXONOMY_CONFIG=industry  # or 'location' or 'hybrid'
```

The configuration loader (`config/index.ts`) will automatically load the appropriate config.

## Customizing Configurations

When you clone this base for a specific project:

1. **Choose base config** that's closest to your needs
2. **Modify fields** in the taxonomy config file
3. **Add/remove features** in `features.config.ts`
4. **Adjust SEO templates** for your domain

### Example: Customizing for a Legal Directory

```typescript
// config/taxonomies/industry.config.ts

export const industryConfig: TaxonomyConfig = {
  taxonomyType: 'industry',
  name: 'Legal Directory',
  
  listingFields: [
    {
      key: 'bar_number',
      label: 'Bar Number',
      type: 'text',
      required: true,
      helpText: 'Your state bar association number',
    },
    {
      key: 'practice_areas',
      label: 'Practice Areas',
      type: 'multiselect',
      required: true,
      options: [
        { value: 'criminal', label: 'Criminal Law' },
        { value: 'family', label: 'Family Law' },
        { value: 'corporate', label: 'Corporate Law' },
        // ... more options
      ],
    },
    // ... more fields
  ],
  
  seoTemplate: {
    titlePattern: '{business_name} - {practice_areas} Attorney | LegalDir',
    descriptionPattern: 'Contact {business_name}, a {practice_areas} attorney with {years_experience} years of experience.',
    schemaType: 'Attorney',
  },
};
```

### Example: Customizing for Real Estate

```typescript
// config/taxonomies/location.config.ts

export const locationConfig: TaxonomyConfig = {
  taxonomyType: 'location',
  name: 'Property Listings',
  
  listingFields: [
    {
      key: 'mls_number',
      label: 'MLS Number',
      type: 'text',
      required: false,
      helpText: 'Multiple Listing Service number',
    },
    {
      key: 'property_type',
      label: 'Property Type',
      type: 'select',
      required: true,
      options: [
        { value: 'single_family', label: 'Single Family Home' },
        { value: 'condo', label: 'Condominium' },
        { value: 'townhouse', label: 'Townhouse' },
        // ... more options
      ],
    },
    // ... more fields
  ],
};
```

## Field Types

Available field types:
- `text` - Single line text input
- `rich_text` - Multi-line rich text editor
- `number` - Numeric input
- `boolean` - Checkbox
- `select` - Dropdown selection
- `multiselect` - Multiple selections
- `date` - Date picker
- `datetime` - Date and time picker
- `location` - Single location picker
- `location_multi` - Multiple locations
- `email` - Email input with validation
- `phone` - Phone number input
- `url` - URL input with validation
- `file` - File upload
- `image` - Image upload

## Feature Flags

Enable or disable features in `features.config.ts`:

```typescript
export const featuresConfig = {
  sdks: {
    reviews: { enabled: true },
    maps: { enabled: true },
    booking: { enabled: false }, // Disable for industry directory
    crm: { enabled: true },
  },
  
  platform: {
    allowUserListings: true,
    requireVerification: false,
    enableMessaging: true,
  },
  
  media: {
    storage: 'wasabi',
    maxImagesPerListing: 20,
  },
  
  seo: {
    enableISR: true,
    revalidateSeconds: 60,
  },
};
```

## SEO Templates

Customize SEO templates using placeholder variables:

```typescript
seoTemplate: {
  titlePattern: '{field1} - {field2} | {site_name}',
  descriptionPattern: '{description} Located in {city}, {region}.',
  schemaType: 'Product', // Schema.org type
}
```

Available variables:
- Any listing field (e.g., `{title}`, `{price}`, `{bedrooms}`)
- Any custom field (e.g., `{years_experience}`, `{certifications}`)
- Taxonomy terms (e.g., `{profession}`, `{city}`, `{category}`)
- System variables (e.g., `{site_name}`)

## Validation

Fields support validation rules:

```typescript
{
  key: 'price',
  label: 'Price',
  type: 'number',
  required: true,
  validation: {
    min: 0,
    max: 10000000,
    message: 'Price must be between $0 and $10,000,000',
  },
}
```

## Usage in Code

### Get Configuration

```typescript
import { getTaxonomyConfig } from '@/config';

const config = getTaxonomyConfig();
const fields = config.listingFields;
```

### Check Feature Status

```typescript
import { isFeatureEnabled } from '@/config/features.config';

if (isFeatureEnabled('sdks.booking')) {
  // Show booking widget
}
```

### Generate SEO

```typescript
import { getTaxonomyService } from '@listing-platform/config';

const taxonomyService = getTaxonomyService();
const title = taxonomyService.generateSEOTitle(listing);
const description = taxonomyService.generateSEODescription(listing);
```

### Validate Fields

```typescript
import { getTaxonomyService } from '@listing-platform/config';

const taxonomyService = getTaxonomyService();
const { valid, errors } = taxonomyService.validateFields(customFields);

if (!valid) {
  console.error('Validation errors:', errors);
}
```

## Environment Variables

Required environment variables:

```bash
# Configuration
TAXONOMY_CONFIG=industry

# Site info
NEXT_PUBLIC_SITE_NAME="My Listing Platform"
NEXT_PUBLIC_SITE_URL="https://example.com"

# Features
ENABLE_BOOKING=false
ENABLE_REVIEWS=true
ENABLE_MAPS=true

# Storage
WASABI_ACCESS_KEY=xxx
WASABI_SECRET_KEY=xxx
WASABI_BUCKET=my-bucket
NEXT_PUBLIC_CDN_URL=https://cdn.example.com

# Maps (if enabled)
NEXT_PUBLIC_MAPBOX_TOKEN=xxx

# Email (if enabled)
EMAIL_FROM=noreply@example.com
RESEND_API_KEY=xxx
```

## Best Practices

1. **Don't edit base configs directly** - Copy and modify for your project
2. **Use environment variables** - For sensitive data and deployment-specific settings
3. **Keep fields minimal** - Only add fields you actually need
4. **Test validation** - Ensure validation rules work as expected
5. **Optimize SEO templates** - Test with real data to ensure good results
6. **Document custom fields** - Add helpful descriptions and placeholder text

## Migration from Existing Projects

If migrating an existing project to this configuration system:

1. Identify your taxonomy type (industry, location, or hybrid)
2. Map your existing fields to the configuration format
3. Set environment variables
4. Test with sample data
5. Adjust SEO templates
6. Deploy and monitor

## Support

For configuration questions:
- See `docs/CONFIGURATION_GUIDE.md` for detailed examples
- See `docs/CLONING_GUIDE.md` for setup instructions
- Check example implementations in `examples/`

