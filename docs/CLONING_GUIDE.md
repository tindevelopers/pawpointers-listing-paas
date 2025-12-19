# Cloning & Setup Guide

This guide will walk you through cloning the Listing Platform Base template and setting it up for your specific use case.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Automated Cloning](#automated-cloning)
4. [Manual Cloning](#manual-cloning)
5. [Database Setup](#database-setup)
6. [Environment Configuration](#environment-configuration)
7. [First Run](#first-run)
8. [Common Use Cases](#common-use-cases)
9. [Troubleshooting](#troubleshooting)

## Quick Start

The fastest way to get started:

```bash
# Clone and configure
./scripts/clone-and-configure.sh

# Follow the interactive prompts
# Then:
cd your-project-name
pnpm install
pnpm dev
```

## Prerequisites

Before cloning, ensure you have:

- **Node.js** 20.x or later
- **pnpm** 10.x or later (`npm install -g pnpm`)
- **Git** 2.x or later
- **Supabase** account (or PostgreSQL + PostGIS)
- **Wasabi** or S3 account (for image storage)

Optional but recommended:
- **Vercel** account (for deployment)
- **Mapbox** account (for maps)
- **Resend** account (for emails)

## Automated Cloning

The automated script handles most setup tasks:

```bash
# From the base template directory
./scripts/clone-and-configure.sh
```

The script will:
1. Ask for project name, taxonomy type, and domain
2. Clone the repository
3. Remove git history
4. Create new git repository
5. Generate `.env.local` with defaults
6. Update package names

### Script Options

```
Project name: legal-directory
Taxonomy type: 
  1) Industry Directory
  2) Location-based
  3) Hybrid
Domain: legaldir.com
Site name: Legal Directory
```

## Manual Cloning

For more control, clone manually:

### 1. Clone Repository

```bash
# Clone the base template
git clone https://github.com/yourusername/listing-platform-base.git my-project
cd my-project
```

### 2. Remove Original Git History

```bash
rm -rf .git
git init
git add .
git commit -m "Initial commit from listing-platform-base"
```

### 3. Update Package Names

Replace `@listing-platform` with your project namespace:

```bash
# On macOS/Linux
find . -type f -name "package.json" -exec sed -i '' 's/@listing-platform/@my-project/g' {} +

# On Linux
find . -type f -name "package.json" -exec sed -i 's/@listing-platform/@my-project/g' {} +
```

### 4. Configure Taxonomy

Copy and customize the appropriate config:

```bash
# For industry directory
cp config/taxonomies/industry.config.ts config/taxonomies/active.config.ts

# For location-based
cp config/taxonomies/location.config.ts config/taxonomies/active.config.ts

# For hybrid
cp config/taxonomies/hybrid.config.ts config/taxonomies/active.config.ts
```

Edit `config/taxonomies/active.config.ts` for your needs.

### 5. Create Environment File

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values (see [Environment Configuration](#environment-configuration)).

## Database Setup

### Option 1: Supabase (Recommended)

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Save your project URL and anon key

2. **Run Migrations**

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Or apply schema manually via SQL Editor
# Copy contents of database/migrations/001_listing_platform_base.sql
```

3. **Update .env.local**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

### Option 2: Self-hosted PostgreSQL

1. **Install PostgreSQL with PostGIS**

```bash
# On Ubuntu/Debian
sudo apt-get install postgresql postgis

# On macOS with Homebrew
brew install postgresql postgis
```

2. **Create Database**

```bash
createdb my_listing_platform
psql my_listing_platform -c "CREATE EXTENSION postgis;"
```

3. **Run Migrations**

```bash
psql my_listing_platform < database/migrations/001_listing_platform_base.sql
```

4. **Update Connection String**

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/my_listing_platform
```

## Environment Configuration

Create `.env.local` in project root:

```bash
# ===================================
# Configuration
# ===================================
TAXONOMY_CONFIG=industry  # or 'location' or 'hybrid'
NEXT_PUBLIC_TAXONOMY_CONFIG=industry

# ===================================
# Site Information
# ===================================
NEXT_PUBLIC_SITE_NAME="Legal Directory"
NEXT_PUBLIC_SITE_URL="https://legaldir.com"
NEXT_PUBLIC_SUPPORT_EMAIL="support@legaldir.com"

# ===================================
# Supabase
# ===================================
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ===================================
# Wasabi Storage
# ===================================
WASABI_ACCESS_KEY=your-access-key
WASABI_SECRET_KEY=your-secret-key
WASABI_BUCKET=my-project-images
WASABI_REGION=us-east-1
WASABI_ENDPOINT=s3.wasabisys.com
NEXT_PUBLIC_CDN_URL=https://cdn.legaldir.com

# ===================================
# Maps (Choose one)
# ===================================
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx
# OR
# NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIza...

# ===================================
# Feature Flags
# ===================================
ENABLE_BOOKING=false
ENABLE_REVIEWS=true
ENABLE_MAPS=true
ENABLE_CRM=true

# ===================================
# Optional: Stripe
# ===================================
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
# STRIPE_SECRET_KEY=sk_test_xxx
# STRIPE_WEBHOOK_SECRET=whsec_xxx

# ===================================
# Optional: Email (Resend)
# ===================================
# EMAIL_FROM=noreply@legaldir.com
# RESEND_API_KEY=re_xxx
```

## First Run

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Verify Configuration

```bash
# Check taxonomy config is loaded
node -e "console.log(require('./config').default.taxonomy.taxonomyType)"
```

### 3. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Verify Database Connection

Check that:
- Admin panel loads: http://localhost:3000/admin
- No database errors in console
- You can create a test listing (after auth setup)

## Common Use Cases

### 1. Industry Directory (Lawyers, Doctors, etc.)

```bash
./scripts/clone-and-configure.sh
# Choose option 1: Industry Directory
```

Then customize:
- `config/taxonomies/industry.config.ts` - Add profession-specific fields
- `database/` - Seed professions and specializations
- Disable booking: `ENABLE_BOOKING=false`

### 2. Real Estate Platform

```bash
./scripts/clone-and-configure.sh
# Choose option 2: Location-based
```

Then customize:
- `config/taxonomies/location.config.ts` - Add property-specific fields
- `database/` - Import geographic data (countries, regions, cities)
- Enable virtual tours: Set `allowVirtualTours: true` in features

### 3. Tourism Activities

```bash
./scripts/clone-and-configure.sh
# Choose option 3: Hybrid
```

Then customize:
- `config/taxonomies/hybrid.config.ts` - Add activity-specific fields
- Enable booking: `ENABLE_BOOKING=true`
- Set up payment processing (Stripe)

### 4. Job Board

Start with Industry config, then:
- Rename "profession" to "job_category"
- Add fields: salary_range, employment_type, remote_ok
- Customize SEO for job postings
- Add application tracking

### 5. Event Listings

Start with Location config, then:
- Add fields: start_date, end_date, venue, capacity
- Enable booking for ticket sales
- Add calendar integration
- Set up event reminders

## Seed Data

### Create Sample Taxonomy Terms

For industry directory:

```sql
-- Insert into Supabase SQL Editor
INSERT INTO taxonomy_types (tenant_id, name, slug, hierarchical)
VALUES ('your-tenant-id', 'Profession', 'profession', true);

INSERT INTO taxonomy_terms (tenant_id, taxonomy_type_id, name, slug, description)
VALUES 
  ('your-tenant-id', 'type-id', 'Legal Services', 'legal-services', NULL),
  ('your-tenant-id', 'type-id', 'Healthcare', 'healthcare', NULL),
  ('your-tenant-id', 'type-id', 'Home Services', 'home-services', NULL);
```

For location-based:

```sql
-- Import countries
INSERT INTO taxonomy_types (tenant_id, name, slug, hierarchical)
VALUES ('your-tenant-id', 'Geography', 'geography', true);

-- Use scripts/seed-locations.js to import full dataset
```

### Create Test Listings

Use the admin panel or API to create test listings.

## Troubleshooting

### Error: "TaxonomyService not initialized"

**Solution:** Ensure environment variable is set:

```bash
echo $TAXONOMY_CONFIG
# Should output: industry, location, or hybrid
```

### Error: "Cannot connect to database"

**Solution:** Check Supabase credentials in `.env.local`:

```bash
# Test connection
npx supabase status
```

### Error: "Module not found: @listing-platform/config"

**Solution:** Install dependencies:

```bash
pnpm install
```

If still fails:

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Images Not Uploading

**Solution:** Verify Wasabi credentials:

```bash
# Test with AWS CLI
aws s3 ls s3://your-bucket --endpoint-url=https://s3.wasabisys.com
```

### Maps Not Showing

**Solution:** Check map provider token:

```bash
# Verify Mapbox token is set
echo $NEXT_PUBLIC_MAPBOX_TOKEN
```

### Build Errors

**Solution:** Clear cache and rebuild:

```bash
pnpm clean
rm -rf .next .turbo
pnpm install
pnpm build
```

## Next Steps

After successful setup:

1. **Customize Configuration** - See [CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md)
2. **Set Up Authentication** - Configure Supabase Auth
3. **Design Your Theme** - Update Tailwind config
4. **Add Sample Data** - Create test listings
5. **Deploy** - Follow [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## Support

- **Issues:** https://github.com/yourusername/listing-platform-base/issues
- **Discussions:** https://github.com/yourusername/listing-platform-base/discussions
- **Documentation:** See `docs/` directory
- **Examples:** See `examples/` directory (coming soon)

## License

MIT License - See [LICENSE](../LICENSE)

