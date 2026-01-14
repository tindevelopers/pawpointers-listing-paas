# Create Public Listings View

## Problem

The portal app expects a database view called `public_listings_view` that doesn't exist, causing errors like:
```
Could not find the table 'public.public_listings_view' in the schema cache
```

## Solution

Run the migration SQL to create the view. You have two options:

### Option 1: Run via Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `omczmkjrpsykpwiyptfj`

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Migration**
   - Copy the contents of: `supabase/migrations/20250110000000_create_public_listings_view.sql`
   - Paste into the SQL editor
   - Click "Run" or press Cmd/Ctrl + Enter

4. **Verify**
   - The view should be created successfully
   - Refresh your portal page - the error should be gone

### Option 2: Run via Supabase CLI

```bash
# If you have Supabase CLI installed
cd /Users/gene/Projects/pawpointers-listing-paas
supabase db push
```

### Option 3: Run SQL Directly

Copy and run this SQL in your Supabase SQL Editor:

```sql
-- Create public listings view
CREATE OR REPLACE VIEW public_listings_view AS
SELECT 
  l.id,
  l.slug,
  l.title,
  l.description,
  l.price,
  -- Convert gallery jsonb array to images array
  COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(l.gallery)
    ),
    ARRAY[]::text[]
  ) as images,
  -- Extract category from taxonomy or custom fields
  COALESCE(
    (SELECT tt.name 
     FROM listing_taxonomies lt
     JOIN taxonomy_terms tt ON lt.taxonomy_term_id = tt.id
     WHERE lt.listing_id = l.id 
       AND lt.is_primary = true
     LIMIT 1),
    l.custom_fields->>'category',
    'Uncategorized'
  ) as category,
  -- Format location from address jsonb
  COALESCE(
    CONCAT_WS(', ',
      l.address->>'city',
      l.address->>'region',
      l.address->>'country'
    ),
    ''
  ) as location,
  -- Map status: 'published' -> 'active' for portal compatibility
  CASE 
    WHEN l.status = 'published' THEN 'active'
    ELSE l.status
  END as status,
  l.created_at,
  l.updated_at
FROM listings l
WHERE l.status = 'published'
  AND (l.expires_at IS NULL OR l.expires_at > now());

-- Grant access
GRANT SELECT ON public_listings_view TO anon;
GRANT SELECT ON public_listings_view TO authenticated;
```

## What This View Does

The `public_listings_view`:
- ✅ Filters to only published listings
- ✅ Maps `status='published'` to `status='active'` for portal compatibility
- ✅ Converts `gallery` jsonb array to `images` text array
- ✅ Extracts `category` from taxonomy or custom fields
- ✅ Formats `location` from address jsonb
- ✅ Excludes expired listings
- ✅ Grants public read access

## After Running

1. **Restart Dev Server** (if needed):
   ```bash
   cd apps/portal
   pnpm dev
   ```

2. **Test the Portal**:
   - Visit: http://localhost:3030
   - The error should be gone
   - If you have listings, they should appear

## Troubleshooting

### Error: "relation listings does not exist"

**Solution**: The `listings` table doesn't exist yet. You need to run the base schema migrations first:
- Check `database/schema/listings.sql`
- Run the base migrations in Supabase

### Error: "permission denied"

**Solution**: Make sure you're running as a database admin or have proper permissions.

### View Created But Still Getting Errors

**Solution**: 
1. Clear Next.js cache: `rm -rf apps/portal/.next`
2. Restart dev server
3. Check browser console for specific errors

## Next Steps

Once the view is created:
1. ✅ Portal homepage should load without errors
2. ✅ Builder.io pages should work
3. ✅ You can start adding listings via the admin panel

