# Fork Setup Guide

This guide walks you through forking and customizing the Listing Platform for your specific vertical (real estate, services, directory, etc.).

## Table of Contents

- [Quick Start](#quick-start)
- [What to Customize](#what-to-customize)
- [Step-by-Step Setup](#step-by-step-setup)
- [Customization Patterns](#customization-patterns)
- [Pulling Upstream Updates](#pulling-upstream-updates)
- [Files Reference](#files-reference)

---

## Quick Start

### 1. Fork the Repository

```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR_ORG/your-listing-platform.git
cd your-listing-platform

# Add upstream remote for future updates
git remote add upstream https://github.com/tindevelopers/listing-paas-base.git
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Your Platform

Edit two files to customize for your vertical:

```bash
# 1. Define your listing type
code config/listing.config.ts

# 2. Set your branding
code config/brand.config.ts
```

### 4. Set Up Environment

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### 5. Start Development

```bash
pnpm dev
```

---

## What to Customize

### ✅ Safe to Modify (Fork-Specific)

These files are designed to be customized in your fork:

| File | Purpose |
|------|---------|
| `config/listing.config.ts` | Listing fields, features, statuses |
| `config/brand.config.ts` | Platform name, colors, company info |
| `config/features.config.ts` | Enable/disable platform features |
| `apps/portal/components/` | Portal UI components |
| `apps/portal/app/` | Portal pages |
| `apps/admin/` | Admin customizations |
| `.env.local` | Environment variables |

### ⚠️ Modify with Caution (May Conflict on Upstream Sync)

These files may be updated in the base platform:

| File | Notes |
|------|-------|
| `packages/@listing-platform/*` | Core packages - extend, don't modify |
| `packages/@tinadmin/*` | UI packages - extend via composition |
| `supabase/migrations/` | Add new migrations, don't edit existing |

### ❌ Don't Modify (Core Infrastructure)

These files should not be modified in forks:

| File | Reason |
|------|--------|
| `turbo.json` | Build configuration |
| `pnpm-workspace.yaml` | Workspace structure |
| Root `package.json` scripts | Common scripts |

---

## Step-by-Step Setup

### Step 1: Configure Listing Type

Edit `config/listing.config.ts`:

```typescript
// CUSTOMIZE: Update for your vertical
export const listingConfig = {
  // Naming
  name: 'Property',         // Single item name
  namePlural: 'Properties', // Plural form
  slug: 'properties',       // URL segment

  // Core fields
  coreFields: {
    title: { enabled: true, required: true, maxLength: 100 },
    description: { enabled: true, required: true },
    price: { enabled: true, currency: 'USD' },
    location: { enabled: true, enableMap: true },
    images: { enabled: true, maxCount: 20 },
    category: { enabled: true, required: true },
  },

  // Custom fields for your vertical
  customFields: [
    {
      name: 'bedrooms',
      type: 'number',
      label: 'Bedrooms',
      min: 0,
      max: 20,
      filterable: true,
      sortable: true,
    },
    {
      name: 'bathrooms',
      type: 'number',
      label: 'Bathrooms',
      min: 0,
      max: 10,
      filterable: true,
    },
    {
      name: 'propertyType',
      type: 'select',
      label: 'Property Type',
      required: true,
      filterable: true,
      options: [
        { value: 'house', label: 'House' },
        { value: 'condo', label: 'Condo' },
        { value: 'apartment', label: 'Apartment' },
      ],
    },
  ],

  // Feature toggles
  features: {
    reviews: true,
    booking: false,  // Enable for rentals
    messaging: true,
    favorites: true,
  },
};
```

### Step 2: Configure Branding

Edit `config/brand.config.ts`:

```typescript
export const brandConfig = {
  platform: {
    name: 'RealEstateHub',
    tagline: 'Find Your Dream Home',
    domain: 'realestatehub.com',
    supportEmail: 'support@realestatehub.com',
  },

  company: {
    name: 'RealEstateHub Inc.',
    email: 'hello@realestatehub.com',
  },

  theme: {
    primaryColor: '#1E40AF',
    primaryColorClass: 'blue-800',
  },

  social: {
    twitter: 'https://twitter.com/realestatehub',
    instagram: 'https://instagram.com/realestatehub',
  },

  seo: {
    defaultTitle: 'RealEstateHub - Find Your Dream Home',
    defaultDescription: 'Browse thousands of properties...',
  },
};
```

### Step 3: Customize Portal Components

Update components in `apps/portal/components/`:

```tsx
// apps/portal/components/listings/ListingCard.tsx

// Look for CUSTOMIZE comments and update:

// CUSTOMIZE: Add custom field badges for your vertical
<div className="flex items-center gap-3 mt-3">
  <span>{listing.customFields?.bedrooms} beds</span>
  <span>•</span>
  <span>{listing.customFields?.bathrooms} baths</span>
  <span>•</span>
  <span>{listing.customFields?.sqft?.toLocaleString()} sqft</span>
</div>
```

### Step 4: Set Up Database

```bash
# Start local Supabase
pnpm supabase start

# Apply migrations
pnpm supabase db reset

# Add your custom migrations if needed
pnpm supabase migration new add_custom_fields
```

### Step 5: Configure Environment

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# API
NEXT_PUBLIC_API_URL=http://localhost:4000

# Branding
NEXT_PUBLIC_SITE_NAME=RealEstateHub
NEXT_PUBLIC_SITE_URL=https://realestatehub.com

# Maps (optional)
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token

# Payments (optional)
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_KEY=pk_...
```

---

## Vercel Deployment

This platform is designed to be deployed as **3 separate Vercel projects** from a single monorepo.

### Project Configuration

| Project | Root Directory | Domain | Build Filter |
|---------|---------------|--------|--------------|
| Portal | `apps/portal` | yourplatform.com | `@tinadmin/portal` |
| Admin | `apps/admin` | admin.yourplatform.com | `@tinadmin/admin` |

### Step-by-Step Vercel Setup

#### 1. Create Two Vercel Projects

```bash
# Install Vercel CLI
npm i -g vercel

# Link each project (run from repo root)
cd apps/portal && vercel link
cd apps/admin && vercel link
```

#### 2. Configure Each Project

**Portal Project:**
- Root Directory: `apps/portal`
- Framework: Next.js
- Build Command: `cd ../.. && pnpm turbo build --filter=@tinadmin/portal`
- Install Command: `cd ../.. && pnpm install`

**Admin Project:**
- Root Directory: `apps/admin`
- Framework: Next.js
- Build Command: `cd ../.. && pnpm turbo build --filter=@tinadmin/admin`
- Install Command: `cd ../.. && pnpm install`

#### 3. Environment Variables

Set these in each Vercel project dashboard:

**All Projects (Shared):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

**Portal Specific:**
```bash
NEXT_PUBLIC_API_URL=https://api.yourplatform.com
NEXT_PUBLIC_SITE_URL=https://yourplatform.com
ROUTING_STRATEGY=industry  # or 'geographic'
REVALIDATION_SECRET=your-secret
# Optional: AI Chat (gateway preferred)
AI_GATEWAY_URL=https://api.ai.gateway.example.com
AI_GATEWAY_API_KEY=your-gateway-key
AI_MODEL=openai/gpt-4.1
EMBEDDING_MODEL=openai/text-embedding-3-small
AI_CHAT_PROVIDER=gateway   # switch to abacus to use Abacus deployments
AI_EMBEDDING_PROVIDER=gateway
ABACUS_DEPLOYMENT_ID=
ABACUS_DEPLOYMENT_TOKEN=
ABACUS_API_KEY=
# Fallback if gateway not configured
OPENAI_API_KEY=sk-xxx
# Optional: Fast Search
TYPESENSE_API_KEY=xxx
TYPESENSE_HOST=xxx.typesense.net
```

**Admin Specific:**
```bash
NEXT_PUBLIC_API_URL=https://api.yourplatform.com
STRIPE_SECRET_KEY=sk_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxx
```

#### 4. Configure Domains

In each Vercel project dashboard:
- Portal: `yourplatform.com` + `www.yourplatform.com`
- Admin: `admin.yourplatform.com`

#### 5. Enable Supabase Database Webhooks

To sync listings to Typesense and trigger cache revalidation:

1. Go to Supabase Dashboard → Database → Webhooks
2. Create webhook for `listings` table:
   - Events: INSERT, UPDATE, DELETE
   - URL: `https://api.yourplatform.com/api/webhooks/supabase`
   - Add header: `x-supabase-signature: your-webhook-secret`

### URL Routing Strategies

Configure in `config/routing.config.ts`:

**Industry Template** (multi-tenant by path):
```
yourplatform.com/[tenant]/listings/[slug]
```

**Geographic Template** (subdomain + geo path):
```
us.yourplatform.com/california/san-francisco/[slug]
```

Set `ROUTING_STRATEGY=industry` or `ROUTING_STRATEGY=geographic` in Portal env vars.

### Optional Services

#### Typesense (Fast Search)
1. Create account at [cloud.typesense.org](https://cloud.typesense.org)
2. Set `TYPESENSE_API_KEY` and `TYPESENSE_HOST`
3. Trigger initial index: `POST /api/search/reindex`

#### Wasabi (Image Storage)
1. Create bucket at [wasabi.com](https://wasabi.com)
2. Set `WASABI_*` environment variables
3. Configure CDN (optional) and set `NEXT_PUBLIC_CDN_URL`

#### AI Gateway (AI Chat)
1. Set `AI_GATEWAY_URL` and `AI_GATEWAY_API_KEY` (preferred)
2. Optionally set `OPENAI_API_KEY` as fallback
3. Chat widget appears automatically when configured

---

## Customization Patterns

### Pattern 1: Adding Custom Fields

1. Add field to `config/listing.config.ts`
2. Create database migration
3. Update components to display field
4. Add to search filters if `filterable: true`

### Pattern 2: Custom Listing Components

```tsx
// apps/portal/components/listings/PropertyFeatures.tsx

import { listingConfig } from '@/config/listing.config';

export function PropertyFeatures({ listing }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {listingConfig.customFields.map((field) => (
        <div key={field.name}>
          <dt>{field.label}</dt>
          <dd>{listing.customFields?.[field.name]}</dd>
        </div>
      ))}
    </div>
  );
}
```

### Pattern 3: Custom Search Filters

```tsx
// apps/portal/components/search/PropertyFilters.tsx

import { getFilterableFields } from '@/config/listing.config';

export function PropertyFilters() {
  const filterableFields = getFilterableFields();

  return (
    <div>
      {filterableFields.map((field) => (
        <FilterField key={field.name} field={field} />
      ))}
    </div>
  );
}
```

### Pattern 4: Extending Core Packages

Don't modify packages directly. Instead, wrap them:

```tsx
// apps/portal/lib/listings-extended.ts

import { searchListings as baseSearch } from '@listing-platform/core';

// Extend with your custom logic
export async function searchListings(params) {
  // Add custom field filtering
  const extendedParams = {
    ...params,
    customFilters: transformToCustomFilters(params),
  };

  return baseSearch(extendedParams);
}
```

---

## Pulling Upstream Updates

### Selective Updates (Recommended)

The platform includes a **selective update system** that allows you to update only specific packages/features from upstream while protecting your customizations. This is the recommended approach for forks.

#### Quick Example: Update Only CRM

```bash
# 1. Preview what would be updated
tsx scripts/selective-update.ts --package crm --dry-run

# 2. Check for conflicts
tsx scripts/detect-conflicts.ts packages/@listing-platform/crm

# 3. Apply the update
tsx scripts/selective-update.ts --package crm

# 4. Validate the update
tsx scripts/validate-update.ts packages/@listing-platform/crm
```

#### Configure Which Packages to Update

Edit `config/update.config.ts` to control which packages can be updated:

```typescript
export const updateConfig: Record<string, PackageUpdateConfig> = {
  'packages/@listing-platform/crm': {
    enabled: true,           // Enable updates for CRM
    strategy: 'merge',
    conflictResolution: 'manual',
  },
  'packages/@listing-platform/reviews': {
    enabled: false,          // Disable updates for Reviews
    strategy: 'skip',
  },
  // ... configure other packages
};
```

#### Benefits of Selective Updates

- **Protect customizations** - Only update what you want
- **Automatic dependency handling** - Dependencies are updated automatically
- **Conflict detection** - Know about conflicts before updating
- **Easy rollback** - Automatic backup branches for safe rollback
- **Validation** - Post-update checks ensure everything works

For detailed information, see [SELECTIVE_UPDATES.md](docs/SELECTIVE_UPDATES.md).

### Full Repository Merge (Alternative)

If you want to merge all changes from upstream:

```bash
# Fetch upstream changes
git fetch upstream

# See what's changed
git log main..upstream/main --oneline

# Merge updates (review changes first!)
git checkout main
git merge upstream/main

# Resolve any conflicts in your customized files
# Then commit the merge
git commit
```

### Recommended Merge Strategy

1. **Before merging**: Commit all your changes
2. **Review conflicts**: Focus on config files and components
3. **Test thoroughly**: Run `pnpm build` and `pnpm test`
4. **Document**: Note any breaking changes from upstream

**Note**: For most forks, selective updates are recommended over full repository merges to better protect customizations.

---

## Files Reference

### Configuration Files

| File | Purpose | Customize? |
|------|---------|-----------|
| `config/listing.config.ts` | Listing type, fields, features | ✅ Yes |
| `config/brand.config.ts` | Branding, company info, theme | ✅ Yes |
| `config/features.config.ts` | Feature flags, SDK configs | ✅ Yes |
| `config/routing.config.ts` | URL strategy (industry/geographic) | ✅ Yes |
| `config/taxonomies/*.ts` | Categories, locations | ⚠️ Carefully |

### Portal App

| Directory | Purpose | Customize? |
|-----------|---------|-----------|
| `apps/portal/app/` | Pages and routes | ✅ Yes |
| `apps/portal/components/` | UI components | ✅ Yes |
| `apps/portal/lib/` | Data fetching, utilities | ✅ Yes |
| `apps/portal/public/` | Static assets | ✅ Yes |

### Admin App

| Directory | Purpose | Customize? |
|-----------|---------|-----------|
| `apps/admin/` | Admin dashboard | ✅ Yes |

### Packages

| Package | Purpose | Customize? |
|---------|---------|-----------|
| `@listing-platform/core` | Core types and utilities | ❌ No (extend) |
| `@listing-platform/shared` | Shared utilities | ❌ No (extend) |
| `@listing-platform/config` | Configuration types | ❌ No (extend) |
| `@listing-platform/search` | Typesense search integration | ❌ No (configure) |
| `@listing-platform/media` | Wasabi image storage | ❌ No (configure) |
| `@listing-platform/ai` | AI chatbot with RAG | ❌ No (configure) |
| `@tinadmin/*` | UI component library | ❌ No (use) |

### Database

| Directory | Purpose | Customize? |
|-----------|---------|-----------|
| `supabase/migrations/` | Database schema | ⚠️ Add new only |
| `database/schemas/` | Reference SQL | 📖 Read only |

---

## Common Customization Examples

### Real Estate Platform

```typescript
// config/listing.config.ts
customFields: [
  { name: 'bedrooms', type: 'number', label: 'Bedrooms', filterable: true },
  { name: 'bathrooms', type: 'number', label: 'Bathrooms', filterable: true },
  { name: 'sqft', type: 'number', label: 'Square Feet', filterable: true, sortable: true },
  { name: 'lotSize', type: 'number', label: 'Lot Size (acres)' },
  { name: 'yearBuilt', type: 'number', label: 'Year Built' },
  { name: 'propertyType', type: 'select', label: 'Type', options: [...], filterable: true },
  { name: 'amenities', type: 'multiselect', label: 'Amenities', options: [...], filterable: true },
]
```

### Service Directory

```typescript
customFields: [
  { name: 'hourlyRate', type: 'number', label: 'Hourly Rate', unit: '/hr', filterable: true },
  { name: 'experience', type: 'number', label: 'Years Experience', filterable: true },
  { name: 'serviceArea', type: 'text', label: 'Service Area' },
  { name: 'availability', type: 'multiselect', label: 'Availability', options: [...] },
  { name: 'certifications', type: 'multiselect', label: 'Certifications', options: [...] },
]
```

### Business Directory

```typescript
customFields: [
  { name: 'businessHours', type: 'text', label: 'Hours' },
  { name: 'phone', type: 'text', label: 'Phone' },
  { name: 'website', type: 'text', label: 'Website' },
  { name: 'priceRange', type: 'select', label: 'Price Range', options: ['$', '$$', '$$$', '$$$$'] },
  { name: 'amenities', type: 'multiselect', label: 'Amenities', options: [...] },
]
```

---

## Need Help?

- 📖 See `docs/CUSTOMIZATION.md` for detailed customization guide
- 📖 See `docs/DEVELOPER_GUIDE.md` for development workflow
- 💬 Open an issue for questions or bugs
- 🔧 Check `config/README.md` for configuration details
