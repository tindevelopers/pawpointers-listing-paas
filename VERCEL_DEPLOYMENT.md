# Vercel Deployment Guide for Pawpointers

## ✅ Projects Created

All three Vercel projects have been created and linked:
- **Portal**: `pawpointers-portal` (public marketplace)
- **Admin**: `pawpointers-admin` (platform control plane)
- **Dashboard**: `pawpointers-dashboard` (merchant admin)

## 📋 Required Environment Variables

Set these in each Vercel project's **Settings → Environment Variables**:

### Required for ALL Apps

```bash
# Supabase (get from Supabase Dashboard → Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site URL (use Vercel's auto-generated URL or your custom domain)
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

### Portal-Specific

```bash
# Same as above, plus:
NEXT_PUBLIC_CDN_URL=https://your-cdn-url.com  # If using CDN for images
```

### Admin-Specific

```bash
# Same as above, plus:
STRIPE_SECRET_KEY=sk_live_...  # If using Stripe billing
STRIPE_WEBHOOK_SECRET=whsec_...  # For Stripe webhooks
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # If using Stripe
```

### Dashboard-Specific

```bash
# Same as Portal (Supabase + Site URL)
# Stripe keys if billing features are enabled
```

## 🚀 Deployment Steps

### 1. Set Environment Variables

For each project (`pawpointers-portal`, `pawpointers-admin`, `pawpointers-dashboard`):

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all required variables listed above
3. Set them for **Production**, **Preview**, and **Development** environments
4. Make sure `NEXT_PUBLIC_SITE_URL` matches the actual deployment URL for each app

### 2. Configure Build Settings (Already Set via vercel.json)

The `vercel.json` files in each app directory configure:
- **Root Directory**: `apps/portal`, `apps/admin`, `apps/dashboard`
- **Build Command**: `cd ../.. && pnpm install && pnpm turbo build --filter=@tinadmin/portal` (or admin/dashboard)
- **Install Command**: `cd ../.. && pnpm install`
- **Output Directory**: `.next`

### 3. Deploy

You can deploy via:
- **Git push** (automatic if repo is connected)
- **Vercel CLI**: `vercel --prod` from each app directory
- **Vercel Dashboard**: Click "Deploy" button

### 4. Verify Deployments

After deployment, test:
- **Portal**: Browse listings, search, view listing details
- **Admin**: Sign in as Platform Admin, manage tenants/users
- **Dashboard**: Sign in as merchant, create listing, respond to reviews

## 🗄️ Database Migrations

### ✅ Migrations Status

**Migrations should already be applied** since you mentioned the database is set up. However, if you need to verify or re-run:

### Verify Migrations Applied

Run this in Supabase SQL Editor:
```sql
-- Check if respond_to_review function exists
SELECT proname, pg_get_function_identity_arguments(oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND proname = 'respond_to_review';

-- Check if key tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('listings', 'reviews', 'conversations', 'users', 'tenants', 'roles');
```

### Apply Migrations (if needed)

If migrations aren't applied, run them via Supabase CLI:
```bash
# From repo root
supabase db push
```

Or manually via Supabase Dashboard → SQL Editor:
1. Open each migration file in `supabase/migrations/`
2. Run them in chronological order (by filename timestamp)

### Key Migrations to Verify

- ✅ `20251204220000_tenant_isolation_rls.sql` - Multi-tenant RLS
- ✅ `20251204230000_listing_platform_foundation.sql` - Listings/reviews tables
- ✅ `20251228000000_messaging_system.sql` - Conversations/messages
- ✅ `20260109000000_owner_review_response.sql` - Review response RPC function

## 🔧 Post-Deployment Checklist

- [ ] Environment variables set for all three projects
- [ ] All apps deployed successfully
- [ ] Portal loads and shows listings
- [ ] Admin sign-in works (Platform Admin)
- [ ] Dashboard sign-in works (Merchant user)
- [ ] Can create listing in Dashboard
- [ ] Can respond to review (tests `respond_to_review` RPC)
- [ ] Inbox conversations load
- [ ] Billing page shows subscription data (if Stripe configured)

## 🐛 Troubleshooting

### Build Fails
- Check that `pnpm` is selected as package manager in Vercel
- Verify all workspace dependencies are in `package.json`
- Check build logs for missing environment variables

### Database Connection Errors
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Check Supabase project is active and not paused
- Verify RLS policies allow authenticated access

### Function Not Found Errors
- Ensure `respond_to_review` migration was applied
- Check Supabase SQL Editor for function existence
- Verify `GRANT EXECUTE` was run for authenticated role

## 📝 Next Steps After Deployment

1. **Set up custom domains** (if needed) in Vercel project settings
2. **Configure Stripe webhooks** pointing to your admin app's `/api/webhooks/stripe` endpoint
3. **Set up monitoring** (Vercel Analytics, Sentry, etc.)
4. **Create initial Platform Admin user** via Supabase SQL or admin UI
5. **Test end-to-end flows**: signup → create tenant → create listing → publish → review → respond


