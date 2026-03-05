# How to Seed Sample Listings

The portal is connected to Supabase, but there are no listings in the database yet. Follow these steps to add sample listings:

## Option 1: Using SQL Script (Recommended)

1. **Open Supabase SQL Editor**:
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**
   - Click **New Query**

2. **Run the seed script**:
   - Copy the contents of `apps/portal/scripts/seed-sample-listings.sql`
   - Paste into the SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)

3. **Verify listings were created**:
   - The script will show you the created listings
   - You can also check in **Table Editor** → `listings` table

## Option 2: Create Listings via Admin Panel

If you have the admin panel set up:

1. Navigate to `http://localhost:3001/admin` (or your admin URL)
2. Sign in with an admin account
3. Go to **Listings** → **Create New**
4. Fill in the listing details
5. Set status to **Published**
6. Save

## Option 3: Create Listings via API

If you have the API server running:

```bash
# Create a listing via API
curl -X POST http://localhost:3002/api/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Sample Listing",
    "slug": "sample-listing",
    "description": "This is a sample listing",
    "status": "published",
    "price": 100.00
  }'
```

## Option 4: Seed by Subscription Tier (Tiered Display Testing)

Use this to create 20–30 sample listings across **unclaimed**, **base** (starter), **middle** (professional), and **top** (enterprise) tiers so you can verify the tiered listing display on the portal.

1. **Prerequisites**: Run `scripts/seed-accounts-direct.sql` first (or ensure you have tenants with plans starter/pro/enterprise and at least one user in `public.users` for claimed listings).
2. **Run the script**: In Supabase SQL Editor, run `apps/portal/scripts/seed-listings-by-tier.sql`.
3. **Verify**: Open the portal Browse Listings page (`/listings`). You should see four sections: "Top Tier Services" (featured cards), "Professional Services" (standard), "Free Tier Services" (compact), and "Claim Your Business" (unclaimed). A verification query at the end of the script lists each seeded listing with its `effective_subscription_tier` and `card_size_variant`.

If you run the script more than once, you may get duplicate-slug errors; use unique slugs or delete existing `seed-*` listings first.

## Verify Listings Appear in Portal

After seeding listings:

1. **Restart your portal dev server** (if needed):
   ```bash
   pnpm dev --filter @tinadmin/portal
   ```

2. **Visit the listings page**:
   - Go to `http://localhost:3030/listings`
   - You should see your listings displayed

3. **Check individual listing pages**:
   - Click on a listing to view its detail page
   - URL format: `http://localhost:3030/listings/[slug]`

## Troubleshooting

**Listings still not showing?**

1. **Check listing status**: Listings must have `status = 'published'` to appear in the portal
2. **Check the view**: Verify `public_listings_view` exists and has data:
   ```sql
   SELECT * FROM public_listings_view LIMIT 5;
   ```
3. **Check RLS policies**: Make sure Row Level Security allows anonymous access to the view
4. **Check console errors**: Look for any errors in the browser console or server logs

**Need more listings?**

- Modify `seed-sample-listings.sql` to add more sample data
- Or use the seed scripts in `scripts/seed/` directory for profession or location-based listings

