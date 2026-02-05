# Dashboard Setup Instructions

## Overview
This guide will help you:
1. Apply RLS policy updates to allow listing owners to access their reviews
2. Create a user account for Premium Pet Grooming Services
3. Assign the user as owner of the listing
4. Test dashboard login

## Step 1: Apply RLS Migration

The migration file `supabase/migrations/20260114000000_fix_rls_for_listing_owners.sql` needs to be applied to your remote Supabase database.

### Option A: Via Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard/project/omczmkjrpsykpwiyptfj
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/20260114000000_fix_rls_for_listing_owners.sql`
5. Click **Run** to execute the migration

### Option B: Via Supabase CLI
```bash
# Link to remote project (if not already linked)
supabase link --project-ref omczmkjrpsykpwiyptfj

# Apply the migration
supabase db push
```

## Step 2: Create User Account and Assign Listing Ownership

Run the setup script:

```bash
cd /Users/foo/projects/pawpointers-listing-paas
npx tsx scripts/setup-premium-pet-grooming-owner.ts
```

Or with custom credentials:

```bash
npx tsx scripts/setup-premium-pet-grooming-owner.ts <email> <password> <full-name>
```

**Default credentials:**
- Email: `premium-pet-grooming@example.com`
- Password: `Password123!`
- Full Name: `Premium Pet Grooming Owner`

The script will:
1. Find the "Premium Pet Grooming Services" listing
2. Create a Supabase Auth user
3. Create a user record in the `users` table
4. Assign the user as `owner_id` of the listing

## Step 3: Test Dashboard Login

1. Go to http://localhost:3032/signin
2. Sign in with the credentials created above
3. You should see:
   - Your listing in the **Listings** page
   - Reviews for your listing in the **Reviews** page
   - Ability to respond to reviews
   - Notifications for new reviews

## What the RLS Policies Enable

After applying the migration, listing owners can:

1. **View all reviews** for their listings (not just approved ones)
   - This allows owners to see pending reviews that need moderation
   - Owners can see reviews before they're approved for public display

2. **Respond to reviews** via the `respond_to_review` function
   - Owners can post responses to any review on their listings
   - Responses are stored in the `owner_response` field

3. **Manage external review sources** (DataForSEO)
   - Owners can configure DataForSEO targets for their listings
   - This enables ingestion of external reviews

4. **View external reviews** for their listings
   - Owners can see external reviews that have been ingested

## Troubleshooting

### "Listing not found" error
- Make sure the listing with slug `premium-pet-grooming-services` exists
- Check that it's in the `listings` table with `status = 'published'`

### "SUPABASE_SERVICE_ROLE_KEY is not set" error
- Make sure you have `.env.local` files in `apps/portal/`, `apps/dashboard/`, or `apps/admin/`
- The script will try to load from any of these locations

### "User already exists" warning
- If the user already exists, the script will use the existing user
- If you want to reassign ownership, manually update the listing's `owner_id` field

### Dashboard shows "No listings"
- Verify the listing has `owner_id` set to your user ID
- Check that you're signed in with the correct user account
- Ensure RLS policies are applied correctly

## Next Steps

After setup is complete:
1. Test creating a review as a Pet Parent
2. Test creating a review as a PawPointers Expert
3. Test responding to reviews from the dashboard
4. Configure DataForSEO targets for external review ingestion
