# Create Categories View

## Problem

The portal is trying to fetch categories from `categories_view`, but this view doesn't exist in your Supabase database.

## Solution

Run the SQL migration to create the `categories_view`.

## Steps

### Option 1: Run via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `create_categories_view.sql`
4. Click **Run**

### Option 2: Run via Supabase CLI

```bash
cd /Users/gene/Projects/pawpointers-listing-paas
supabase db push
```

This will run the migration file: `supabase/migrations/20250110000001_create_categories_view.sql`

## What This View Does

The `categories_view`:
- Aggregates unique categories from `public_listings_view`
- Counts listings per category
- Creates URL-friendly slugs (e.g., "Real Estate" → "real-estate")
- Filters out empty/null categories
- Orders categories alphabetically
- Is accessible to anonymous users (via RLS)

## View Structure

```sql
SELECT
  slug,    -- URL-friendly category identifier
  name,    -- Display name of category
  count    -- Number of listings in this category
FROM categories_view
```

## Verification

After creating the view, verify it works:

```sql
SELECT * FROM categories_view LIMIT 10;
```

You should see categories with their counts.

## Troubleshooting

If you get an error that `public_listings_view` doesn't exist:
1. First create `public_listings_view` (see `SETUP_DATABASE.md`)
2. Then create `categories_view`

If you get permission errors:
- Make sure RLS policies allow anonymous access
- Check that `GRANT SELECT` statements ran successfully

