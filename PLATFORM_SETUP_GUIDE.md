# Complete Platform Setup Guide

This guide covers setting up all platforms using Supabase CLI and Vercel CLI.

## 🚀 Quick Start

Run the complete setup script:

```bash
npm run setup:all
```

Or run individual setup scripts:

```bash
# Supabase Cloud setup
npm run supabase:link-cloud

# Vercel deployment setup
npm run vercel:setup
```

## 📋 Prerequisites

### Required Tools

1. **Supabase CLI**
   ```bash
   # macOS
   brew install supabase/tap/supabase
   
   # Linux/Windows
   npm install -g supabase
   ```

2. **Vercel CLI**
   ```bash
   npm install -g vercel
   ```

3. **Node.js & pnpm**
   ```bash
   # Already installed if you're working on this project
   node --version  # Should be >= 20
   pnpm --version  # Should be installed
   ```

### Required Accounts

1. **Supabase Account**
   - Sign up at https://supabase.com
   - Create a new project

2. **Vercel Account**
   - Sign up at https://vercel.com
   - Connect your GitHub account (recommended)

## 🔧 Step-by-Step Setup

### Step 1: Supabase Cloud Setup

#### Option A: Automated Script (Recommended)

```bash
npm run supabase:link-cloud
```

This script will:
- ✅ Authenticate with Supabase
- ✅ Link to your Supabase project
- ✅ Pull environment variables
- ✅ Update `.env.local`
- ✅ Push database migrations

#### Option B: Manual Setup

1. **Login to Supabase CLI:**
   ```bash
   supabase login
   ```

2. **Link to your project:**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   
   Find your project ref: https://app.supabase.com → Project → Settings → General

3. **Push migrations:**
   ```bash
   supabase db push
   ```

4. **Get credentials:**
   ```bash
   supabase status --linked
   ```

5. **Update `.env.local`:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=<from-status-output>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<from-status-output>
   SUPABASE_SERVICE_ROLE_KEY=<from-status-output>
   ```

### Step 2: Vercel Deployment Setup

#### Option A: Automated Script (Recommended)

```bash
npm run vercel:setup
```

This script will:
- ✅ Authenticate with Vercel
- ✅ Link each platform to Vercel projects
- ✅ Deploy preview or production builds
- ✅ Guide you through environment variable setup

#### Option B: Manual Setup

**Deploy Admin App:**

```bash
cd apps/admin
vercel link
vercel deploy --prod
```

**Deploy Portal App:**

```bash
cd apps/portal
vercel link
vercel deploy --prod
```

**Deploy Dashboard App:**

```bash
cd apps/dashboard
vercel link
vercel deploy --prod
```

**Deploy API Server:**

```bash
cd packages/api-server
vercel link
vercel deploy --prod
```

### Step 3: Environment Variables

#### Sync from .env.local to Vercel

```bash
./scripts/sync-env-to-vercel.sh
```

Or set manually in Vercel Dashboard:

1. Go to https://vercel.com
2. Select your project
3. Settings → Environment Variables
4. Add these variables:

**Required for all platforms:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

**For API Server:**
- `SUPABASE_URL` (same as NEXT_PUBLIC_SUPABASE_URL)
- `SUPABASE_ANON_KEY` (same as NEXT_PUBLIC_SUPABASE_ANON_KEY)
- `SUPABASE_SERVICE_KEY` (same as SUPABASE_SERVICE_ROLE_KEY)

**Optional:**
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

## 📦 Platform-Specific Configuration

### Admin App (`apps/admin`)

**Vercel Configuration:**
- Root Directory: `apps/admin`
- Build Command: `cd ../.. && pnpm turbo build --filter=@tinadmin/admin`
- Framework: Next.js
- Output Directory: `.next`

**Environment Variables:**
- All Supabase variables
- Stripe keys (if using payments)
- Multi-tenant configuration

### Portal App (`apps/portal`)

**Vercel Configuration:**
- Root Directory: `apps/portal`
- Build Command: `cd ../.. && pnpm turbo build --filter=@tinadmin/portal`
- Framework: Next.js
- Output Directory: `.next`

**Environment Variables:**
- All Supabase variables
- Public-facing variables only

### Dashboard App (`apps/dashboard`)

**Vercel Configuration:**
- Root Directory: `apps/dashboard`
- Build Command: `cd ../.. && pnpm turbo build --filter=@tinadmin/dashboard`
- Framework: Next.js
- Output Directory: `.next`

**Environment Variables:**
- All Supabase variables

### API Server (`packages/api-server`)

**Vercel Configuration:**
- Root Directory: `packages/api-server`
- Build Command: `pnpm build`
- Framework: Other
- Output Directory: `dist`
- Runtime: Node.js 20.x

**Environment Variables:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- API-specific variables

## 🔄 Database Migrations

### Local Development

Migrations run automatically when you start Supabase:

```bash
supabase start
```

### Cloud Deployment

Push migrations to cloud:

```bash
supabase db push
```

Or use Supabase Dashboard:
1. Go to SQL Editor
2. Run migrations from `supabase/migrations/` in order

## 🌐 Custom Domains

### Setting Up Domains in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain
3. Configure DNS as instructed

**Example DNS Configuration:**

```
Type    Name              Value
A       @                 76.76.21.21
CNAME   www               cname.vercel-dns.com
CNAME   admin             cname.vercel-dns.com
CNAME   api               cname.vercel-dns.com
```

## ✅ Verification Checklist

After setup, verify:

- [ ] Supabase project linked (`supabase status --linked`)
- [ ] Migrations pushed successfully
- [ ] All platforms deployed to Vercel
- [ ] Environment variables set in Vercel
- [ ] Custom domains configured (if applicable)
- [ ] SSL certificates active
- [ ] Authentication working
- [ ] API endpoints responding

## 🛠️ Troubleshooting

### Supabase Issues

**"Project not linked"**
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

**"Migrations failed"**
```bash
# Check migration status
supabase db remote commit

# Push migrations
supabase db push
```

**"Authentication failed"**
```bash
supabase login
```

### Vercel Issues

**"Build failed"**
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Ensure build command is correct

**"Environment variables not working"**
- Verify variables are set in Vercel dashboard
- Check variable names match exactly
- Restart deployment after adding variables

**"Project not linked"**
```bash
cd apps/<platform>
vercel link
```

## 📚 Additional Resources

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Vercel CLI Docs](https://vercel.com/docs/cli)
- [LINK_SUPABASE.md](./LINK_SUPABASE.md) - Detailed Supabase setup
- [docs/VERCEL_DEPLOYMENT.md](./docs/VERCEL_DEPLOYMENT.md) - Detailed Vercel setup

## 🎯 Quick Reference Commands

```bash
# Supabase
npm run supabase:link-cloud      # Link to cloud
npm run supabase:migrate         # Push migrations
npm run supabase:verify          # Verify connection

# Vercel
npm run vercel:setup             # Setup all platforms
npm run vercel:deploy            # Deploy current directory

# Complete Setup
npm run setup:all                # Full setup (Supabase + Vercel)

# Environment Variables
./scripts/sync-env-to-vercel.sh  # Sync .env.local to Vercel
```

