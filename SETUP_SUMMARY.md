# Setup Summary - Quick Reference

## 🎯 One-Command Setup

```bash
npm run setup:all
```

This runs the complete setup for:
- ✅ Supabase Cloud (via CLI)
- ✅ Database migrations
- ✅ Vercel deployment (all platforms)

## 📦 What Gets Set Up

### Platforms Deployed to Vercel

1. **Admin App** (`apps/admin`)
   - Admin dashboard and management interface
   - Deployed to: `admin.yourdomain.com` (or Vercel URL)

2. **Portal App** (`apps/portal`)
   - Public-facing listing portal
   - Deployed to: `yourdomain.com` (or Vercel URL)

3. **Dashboard App** (`apps/dashboard`)
   - User dashboard
   - Deployed to: `dashboard.yourdomain.com` (or Vercel URL)

4. **API Server** (`packages/api-server`)
   - Backend API (Hono)
   - Deployed to: `api.yourdomain.com` (or Vercel URL)

### Supabase Setup

- ✅ Project linked via Supabase CLI
- ✅ Environment variables configured
- ✅ Database migrations pushed
- ✅ Connection verified

## 🚀 Individual Commands

### Supabase

```bash
# Link to Supabase Cloud
npm run supabase:link-cloud

# Push migrations
npm run supabase:migrate

# Verify connection
npm run supabase:verify
```

### Vercel

```bash
# Setup all platforms
npm run vercel:setup

# Deploy current directory
npm run vercel:deploy

# Sync environment variables
npm run vercel:sync-env
```

## 📋 Prerequisites Checklist

Before running setup:

- [ ] Supabase CLI installed (`brew install supabase/tap/supabase`)
- [ ] Vercel CLI installed (`npm install -g vercel`)
- [ ] Supabase account created
- [ ] Supabase project created
- [ ] Vercel account created
- [ ] GitHub repository (for Vercel integration)

## 🔑 Environment Variables

After setup, ensure these are set in Vercel for each platform:

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

**For API Server:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

## 📚 Documentation

- **[PLATFORM_SETUP_GUIDE.md](./PLATFORM_SETUP_GUIDE.md)** - Complete setup guide
- **[LINK_SUPABASE.md](./LINK_SUPABASE.md)** - Supabase setup details
- **[QUICK_START_SUPABASE.md](./QUICK_START_SUPABASE.md)** - Quick Supabase setup
- **[docs/VERCEL_DEPLOYMENT.md](./docs/VERCEL_DEPLOYMENT.md)** - Vercel deployment details

## ✅ Post-Setup Verification

After setup completes:

1. **Check Supabase:**
   ```bash
   supabase status --linked
   ```

2. **Check Vercel:**
   ```bash
   vercel ls
   ```

3. **Test Deployments:**
   - Visit each platform's Vercel URL
   - Test authentication
   - Verify API endpoints

4. **Check Environment Variables:**
   - Vercel Dashboard → Each Project → Settings → Environment Variables
   - Verify all required variables are set

## 🆘 Troubleshooting

**Setup script fails?**
- Check prerequisites are installed
- Verify you're logged into Supabase (`supabase login`)
- Verify you're logged into Vercel (`vercel login`)

**Migrations fail?**
- Check Supabase project is linked
- Verify database connection
- Check migration files in `supabase/migrations/`

**Vercel deployment fails?**
- Check build logs in Vercel dashboard
- Verify environment variables are set
- Check `vercel.json` configuration

For detailed troubleshooting, see [PLATFORM_SETUP_GUIDE.md](./PLATFORM_SETUP_GUIDE.md)


