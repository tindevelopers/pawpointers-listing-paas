# Enable Vercel Deployments from GitHub

Your code has been committed to `main` branch. To enable automatic Vercel deployments:

## Option 1: Via Vercel Dashboard (Recommended)

### Step 1: Import Projects

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your repository: `tindevelopers/pawpointers-listing-paas`

### Step 2: Create Projects for Each Platform

You need to create **4 separate projects** in Vercel:

#### Admin App
- **Project Name**: `pawpointers-admin` (or your preferred name)
- **Root Directory**: `apps/admin`
- **Framework Preset**: Next.js
- **Build Command**: `cd ../.. && pnpm install && pnpm turbo build --filter=@tinadmin/admin`
- **Output Directory**: `.next`
- **Install Command**: `cd ../.. && pnpm install`

#### Portal App
- **Project Name**: `pawpointers-portal`
- **Root Directory**: `apps/portal`
- **Framework Preset**: Next.js
- **Build Command**: `cd ../.. && pnpm install && pnpm turbo build --filter=@tinadmin/portal`
- **Output Directory**: `.next`
- **Install Command**: `cd ../.. && pnpm install`

#### Dashboard App
- **Project Name**: `pawpointers-dashboard`
- **Root Directory**: `apps/dashboard`
- **Framework Preset**: Next.js
- **Build Command**: `cd ../.. && pnpm install && pnpm turbo build --filter=@tinadmin/dashboard`
- **Output Directory**: `.next`
- **Install Command**: `cd ../.. && pnpm install`

#### API Server
- **Project Name**: `pawpointers-api`
- **Root Directory**: `packages/api-server`
- **Framework Preset**: Other
- **Build Command**: `cd ../.. && pnpm install && cd packages/api-server && pnpm build`
- **Output Directory**: `dist`
- **Install Command**: `cd ../.. && pnpm install`

### Step 3: Configure Environment Variables

For each project, go to **Settings → Environment Variables** and add:

**Required for all:**
- `NEXT_PUBLIC_SUPABASE_URL` = `https://omczmkjrpsykpwiyptfj.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (from your Supabase dashboard)
- `SUPABASE_SERVICE_ROLE_KEY` = (from your Supabase dashboard)

**For API Server only:**
- `SUPABASE_URL` = `https://omczmkjrpsykpwiyptfj.supabase.co`
- `SUPABASE_ANON_KEY` = (same as NEXT_PUBLIC_SUPABASE_ANON_KEY)
- `SUPABASE_SERVICE_KEY` = (same as SUPABASE_SERVICE_ROLE_KEY)

### Step 4: Enable Auto-Deployments

1. Go to **Settings → Git**
2. Ensure "Production Branch" is set to `main`
3. Enable "Automatic deployments from Git"
4. Enable "Preview deployments for Pull Requests"

## Option 2: Via Vercel CLI

If you prefer using the CLI:

```bash
# For each platform, navigate to its directory and link:
cd apps/admin && vercel link
cd ../portal && vercel link
cd ../dashboard && vercel link
cd ../../packages/api-server && vercel link
```

Then set environment variables:
```bash
npm run vercel:sync-env
```

## Option 3: GitHub Actions (Already Configured)

The GitHub Actions workflow (`.github/workflows/vercel-deploy.yml`) is already set up and will:
- ✅ Deploy to production on push to `main`
- ✅ Create preview deployments for pull requests
- ✅ Deploy all 4 platforms automatically

**Required GitHub Secrets:**

Add these in GitHub → Settings → Secrets and variables → Actions:

1. `VERCEL_TOKEN` - Get from https://vercel.com/account/tokens
2. `VERCEL_ORG_ID` - Get from Vercel dashboard → Settings → General
3. `VERCEL_PROJECT_ID` - Get from each project's Settings → General

**Note:** You'll need separate `VERCEL_PROJECT_ID` secrets for each platform:
- `VERCEL_PROJECT_ID_ADMIN`
- `VERCEL_PROJECT_ID_PORTAL`
- `VERCEL_PROJECT_ID_DASHBOARD`
- `VERCEL_PROJECT_ID_API`

## Verify Deployments

After setup:

1. **Check Vercel Dashboard:**
   - Go to https://vercel.com/dashboard
   - You should see deployments triggered by the push to `main`

2. **Check GitHub Actions:**
   - Go to https://github.com/tindevelopers/pawpointers-listing-paas/actions
   - You should see the workflow running

3. **Test Deployments:**
   - Visit each platform's Vercel URL
   - Verify they're working correctly

## Troubleshooting

**Deployments not triggering?**
- Check GitHub repository is connected in Vercel
- Verify branch is set to `main` in Vercel settings
- Check GitHub Actions secrets are set correctly

**Build failures?**
- Check build logs in Vercel dashboard
- Verify environment variables are set
- Check that `pnpm` is available in build environment

**Environment variables not working?**
- Ensure variables are set for the correct environment (Production/Preview)
- Restart deployment after adding variables
- Check variable names match exactly (case-sensitive)

## Next Steps

1. ✅ Code committed to `main`
2. ⏳ Set up Vercel projects (choose Option 1, 2, or 3 above)
3. ⏳ Configure environment variables
4. ⏳ Verify deployments are working
5. ⏳ Set up custom domains (optional)


