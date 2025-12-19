# Listing Platform Base Template

**A flexible, configuration-driven template for building any type of listing platform.**

Turn this template into:
- 🏢 **Industry Directories** - Lawyers, Doctors, Contractors, Pet Services
- 🏘️ **Real Estate Platforms** - Properties, Rentals, Commercial Listings
- ✈️ **Tourism Platforms** - Activities, Tours, Events, Experiences
- 💼 **Job Boards** - Employment listings with applications
- 🛍️ **Marketplaces** - Products, Services, Classifieds
- 📍 **Local Business Directories** - Restaurants, Shops, Services

## Why This Template?

Instead of building separate codebases for different listing platforms, this template uses **configuration-driven architecture** to support any taxonomy structure:

- **One Codebase, Infinite Possibilities** - Clone and configure for any use case
- **No Code Changes Required** - Just edit configuration files
- **Production-Ready** - Built on Next.js 15, Supabase, Vercel
- **SEO-Optimized** - Static pages, ISR, structured data
- **Fully Extensible** - SDK-based architecture for features

## Quick Start

```bash
# Clone and configure for your use case
./scripts/clone-and-configure.sh

# Follow prompts, then:
cd your-project-name
pnpm install
pnpm dev
```

## Architecture Overview

```
┌─────────────────────────────────────────┐
│    Configuration Layer                  │
│  • Taxonomy Type (industry/location)    │
│  • Custom Fields                        │
│  • Feature Flags                        │
│  • SEO Templates                        │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│    Universal Database Schema            │
│  • Flexible Taxonomies                  │
│  • Dynamic Fields                       │
│  • Multi-tenant Ready                   │
│  • PostGIS for Locations                │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│    Feature SDKs (Optional)              │
│  • Reviews & Ratings                    │
│  • Maps (Mapbox/Google/OSM)            │
│  • Booking System                       │
│  • CRM & Messaging                      │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│    Apps (Next.js 15)                    │
│  • Admin Panel                          │
│  • Public Portal                        │
│  • Dynamic Routing                      │
│  • ISR & Static Pages                   │
└─────────────────────────────────────────┘
```

## Configuration Examples

### Industry Directory (Profession-based)

```typescript
// config/taxonomies/industry.config.ts
{
  taxonomyType: 'industry',
  primaryTaxonomy: {
    name: 'profession',
    urlPattern: '/{profession}/{slug}',
    // Results in: /lawyers/john-doe-law-firm
  },
  listingFields: [
    { key: 'business_name', type: 'text', required: true },
    { key: 'years_experience', type: 'number' },
    { key: 'certifications', type: 'multiselect' },
  ],
  enabledFeatures: {
    reviews: true,
    booking: false,
    maps: true,
  }
}
```

**Use Cases:**
- Legal Directory
- Healthcare Providers
- Home Services
- Pet Services
- Financial Advisors

### Location-based Platform

```typescript
// config/taxonomies/location.config.ts
{
  taxonomyType: 'location',
  primaryTaxonomy: {
    name: 'geography',
    urlPattern: '/{country}/{region}/{city}/{slug}',
    // Results in: /usa/california/san-francisco/luxury-condo
  },
  listingFields: [
    { key: 'bedrooms', type: 'number' },
    { key: 'bathrooms', type: 'number' },
    { key: 'square_feet', type: 'number' },
    { key: 'amenities', type: 'multiselect' },
  ],
  enabledFeatures: {
    reviews: true,
    booking: true,
    maps: true,
    virtualTour: true,
  }
}
```

**Use Cases:**
- Real Estate Listings
- Vacation Rentals
- Event Venues
- Tourism Attractions

### Hybrid Platform

```typescript
// config/taxonomies/hybrid.config.ts
{
  taxonomyType: 'hybrid',
  primaryTaxonomy: {
    name: 'category',
    urlPattern: '/{category}/{city}/{slug}',
    // Results in: /water-sports/miami/jet-ski-rental
  },
  secondaryTaxonomies: [
    { name: 'location', urlPattern: '/in/{location}' }
  ],
  enabledFeatures: {
    reviews: true,
    booking: true,
    maps: true,
  }
}
```

**Use Cases:**
- Tourism Activities
- Events & Classes
- Restaurants & Dining
- Services by Location

## Key Features

### ✅ Flexible Taxonomy System

- **Hierarchical** - Unlimited levels (Legal > Lawyers > Family Law)
- **Multiple Taxonomies** - Combine profession + location + specialization
- **Dynamic URLs** - Configure your own URL patterns
- **SEO-Friendly** - Breadcrumbs, structured data, sitemaps

### ✅ Dynamic Field System

Define custom fields per listing type:

```typescript
listingFields: [
  {
    key: 'years_experience',
    label: 'Years of Experience',
    type: 'number',
    required: false,
    filterable: true,
    displayInCard: true,
  },
  // Add unlimited custom fields
]
```

Supported field types:
- Text, Rich Text, Number, Boolean
- Select, Multi-select
- Date, DateTime
- Email, Phone, URL
- Location, Multi-location
- File, Image uploads

### ✅ Feature SDKs

**Reviews & Ratings:**
- Star ratings with aggregates
- Photo/video reviews
- Helpful votes
- Owner responses
- Auto/manual moderation

**Maps & Location:**
- Provider-agnostic (Mapbox, Google, OSM)
- Radius search
- Service areas
- Nearby places
- Directions

**Booking System:**
- Availability calendar
- Instant booking
- Payment processing (Stripe)
- Cancellation policies
- Reminders & notifications

**CRM & Lead Management:**
- Inquiry tracking
- User messaging
- Lead scoring
- Email automation

### ✅ Admin Panel

- Tenant management
- Listing moderation
- User management
- Analytics dashboard
- Configuration UI

### ✅ SEO & Performance

- **Static Generation** - Pre-render up to 1000 pages
- **ISR** - Incremental Static Regeneration
- **Structured Data** - Schema.org JSON-LD
- **Sitemap** - Auto-generated
- **Image Optimization** - Next.js + Wasabi/S3
- **Edge Functions** - Vercel Edge Runtime

### ✅ Multi-tenant Architecture

- Row-Level Security (RLS)
- Tenant isolation
- Custom domains per tenant
- White-label ready

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL + PostGIS)
- **Storage:** Wasabi / S3
- **Auth:** Supabase Auth
- **Payments:** Stripe (optional)
- **Maps:** Mapbox / Google Maps / OpenStreetMap
- **Deployment:** Vercel
- **Monorepo:** Turborepo + pnpm

## Project Structure

```
listing-platform-as-a-service/
├── apps/
│   ├── admin/          # Admin panel
│   └── portal/         # Public listing portal
├── packages/
│   ├── @listing-platform/
│   │   ├── config/     # Configuration system
│   │   ├── core/       # Shared utilities
│   │   ├── ui-admin/   # Admin components
│   │   └── ui-consumer/# Public components
│   └── sdks/           # Feature SDKs
│       ├── reviews/
│       ├── maps/
│       └── booking/
├── config/
│   ├── taxonomies/     # Taxonomy configurations
│   │   ├── industry.config.ts
│   │   ├── location.config.ts
│   │   └── hybrid.config.ts
│   └── features.config.ts
├── database/
│   ├── schema/         # Database schemas
│   └── migrations/     # Migration files
├── docs/               # Documentation
├── scripts/            # Utility scripts
└── [config files]
```

## Getting Started

### 1. Clone the Template

```bash
./scripts/clone-and-configure.sh
```

Or manually:

```bash
git clone https://github.com/yourusername/listing-platform-base.git my-project
cd my-project
rm -rf .git && git init
```

### 2. Choose Taxonomy Type

Set in `.env.local`:

```bash
TAXONOMY_CONFIG=industry  # or 'location' or 'hybrid'
```

### 3. Configure Fields

Edit `config/taxonomies/{type}.config.ts`:

```typescript
listingFields: [
  // Add your custom fields
]
```

### 4. Set Up Database

```bash
# Create Supabase project
# Run migrations from database/migrations/
```

### 5. Install & Run

```bash
pnpm install
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Documentation

- **[Cloning Guide](docs/CLONING_GUIDE.md)** - How to clone and setup
- **[Configuration Guide](docs/CONFIGURATION_GUIDE.md)** - Detailed configuration
- **[Database Schema](database/README.md)** - Schema documentation
- **[Deployment](docs/DEPLOYMENT.md)** - Deploy to Vercel
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Development workflow

## Real-World Examples

### Legal Directory
```
Taxonomy: Profession (Lawyers, Notaries, Mediators)
URL: /lawyers/john-doe-law-firm
Features: Reviews, Maps, Inquiry, Comparison
```

### Real Estate
```
Taxonomy: Geography (Country > Region > City)
URL: /usa/california/san-francisco/luxury-condo-123
Features: Reviews, Booking, Maps, Virtual Tours
```

### Tourism Activities
```
Taxonomy: Category + Location
URL: /water-sports/miami/jet-ski-rental
Features: Reviews, Booking, Maps, Gallery
```

### Job Board
```
Taxonomy: Industry > Job Category
URL: /technology/software-engineer/senior-dev-acme
Features: Reviews (Company), Applications, Saved Jobs
```

## Deployment

### Vercel (Recommended)

```bash
# Connect to Vercel
vercel link

# Deploy
vercel --prod
```

### Docker

```bash
docker build -t listing-platform .
docker run -p 3000:3000 listing-platform
```

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for details.

## Roadmap

- [ ] Visual configuration UI (no-code setup)
- [ ] More SDK modules (Messaging, Analytics, Marketing)
- [ ] Multi-language support (i18n)
- [ ] Mobile apps (React Native)
- [ ] AI-powered search & recommendations
- [ ] Advanced analytics dashboard

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT License - See [LICENSE](LICENSE)

## Support

- **Documentation:** `/docs` directory
- **Issues:** [GitHub Issues](https://github.com/yourusername/listing-platform-base/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/listing-platform-base/discussions)

---

**Built with ❤️ by [Your Name](https://yourwebsite.com)**

