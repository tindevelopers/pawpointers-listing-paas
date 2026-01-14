# Database Setup Instructions

## Problem

The portal needs a `listings` table and `public_listings_view` to work properly. These don't exist yet in your Supabase database.

## Solution

Run the complete setup script to create everything needed.

## Quick Setup (Recommended)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Copy and Run the Complete Script**
   - Open: `apps/portal/setup_database_complete.sql`
   - Copy **ALL** the SQL (from `CREATE EXTENSION` to the end)
   - Paste into SQL Editor
   - Click "Run"

4. **Verify Success**
   - You should see: "Database setup complete!"
   - Refresh your portal: http://localhost:3030
   - The error should be gone!

## What Gets Created

✅ **Extensions**: uuid-ossp, postgis  
✅ **listings table**: Main table for storing listings  
✅ **Indexes**: For fast queries  
✅ **public_listings_view**: Public-facing view for portal  
✅ **Permissions**: Public read access  
✅ **RLS Policies**: Security policies  

## Alternative: Step-by-Step Setup

If you prefer to run commands separately:

### Step 1: Create Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
```

### Step 2: Create Listings Table
Copy the `CREATE TABLE listings` section from `setup_database_complete.sql`

### Step 3: Create View
Copy the `CREATE OR REPLACE VIEW public_listings_view` section

### Step 4: Grant Permissions
Copy the `GRANT` statements

## Testing

After setup, test with:

```sql
-- Check if table exists
SELECT * FROM listings LIMIT 1;

-- Check if view exists
SELECT * FROM public_listings_view LIMIT 1;
```

## Adding Sample Data (Optional)

To add a test listing:

```sql
INSERT INTO listings (
  title, 
  slug, 
  description, 
  price, 
  status,
  published_at
) VALUES (
  'Sample Listing',
  'sample-listing',
  'This is a sample listing for testing',
  99.99,
  'published',
  now()
);
```

Then visit: http://localhost:3030/sample-listing

## Troubleshooting

### Error: "extension postgis does not exist"
**Solution**: Supabase should have postgis enabled by default. If not, contact Supabase support.

### Error: "permission denied"
**Solution**: Make sure you're running as database admin in Supabase dashboard.

### View Created But Still Getting Errors
**Solution**: 
1. Clear Next.js cache: `rm -rf apps/portal/.next`
2. Restart dev server
3. Check browser console

## Next Steps

Once the database is set up:
1. ✅ Portal homepage should load
2. ✅ Builder.io pages should work
3. ✅ You can start adding listings via admin panel or API

