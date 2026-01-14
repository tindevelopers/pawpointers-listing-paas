# Deploy PawPointers Portal

## Current Issue
The Vercel project's root directory is set to `.` but needs to be `apps/portal` for the monorepo setup.

## Quick Fix (Choose One)

### Option 1: Update via Vercel Dashboard (Recommended - 2 minutes)

1. Go to: https://vercel.com/tindeveloper/pawpointers-portal/settings/general
2. Scroll to **"Root Directory"** section
3. Change from `.` to `apps/portal`
4. Click **"Save"**
5. Then deploy: `cd apps/portal && vercel --prod`

### Option 2: Update via API Script

1. Get your Vercel token: https://vercel.com/account/tokens
2. Run:
   ```bash
   ./scripts/update-vercel-root-directory.sh pawpointers-portal apps/portal <your-token>
   ```
3. Then deploy: `cd apps/portal && vercel --prod`

### Option 3: Re-link Project

```bash
cd apps/portal
rm -rf .vercel
vercel link
# When prompted:
# - Select existing project: pawpointers-portal
# - Root directory: apps/portal
# - Build command: cd ../.. && pnpm turbo build --filter=@tinadmin/portal
# - Install command: cd ../.. && pnpm install
```

## After Updating Root Directory

Once the root directory is updated, deploy with:

```bash
cd apps/portal
vercel --prod
```

## Verify Deployment

After deployment, check:
- Build logs in Vercel dashboard
- Deployment URL works
- Environment variables are set correctly

## Required Environment Variables

Make sure these are set in Vercel Dashboard → Settings → Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (if needed)

