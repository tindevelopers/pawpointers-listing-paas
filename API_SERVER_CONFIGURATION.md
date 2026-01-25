# API Server Configuration - Correct Setup

## ✅ Correct API Server

**Project Name:** `pawpointers-api-server`  
**Domain:** `https://pawpointers-api.tinconnect.com`  
**Root Directory:** `packages/api-server`

## 🔧 All Apps Must Point To

```
NEXT_PUBLIC_API_URL=https://pawpointers-api.tinconnect.com
```

## 📋 Apps That Need Configuration

### 1. Portal (`pawpointers-portal`)
- ✅ Already configured: `apps/portal/VERCEL_ENV_VARS.md`
- ✅ Environment variable: `NEXT_PUBLIC_API_URL=https://pawpointers-api.tinconnect.com`
- ✅ Code uses: `process.env.NEXT_PUBLIC_API_URL` in:
  - `apps/portal/lib/listings.ts`
  - `apps/portal/lib/taxonomy.ts`
  - `apps/portal/lib/knowledge-base.ts`

### 2. Admin (`pawpointers-admin`)
- ⚠️ Needs verification: Check Vercel environment variables
- ⚠️ Code uses: `process.env.NEXT_PUBLIC_API_URL` in:
  - `apps/admin/app/saas/support/knowledge-base/page.tsx`

### 3. Dashboard (`pawpointers-dashboard`)
- ⚠️ Needs verification: Check Vercel environment variables
- ⚠️ May need API URL configuration

## 🚀 Setting Environment Variables in Vercel

### For Portal:
```bash
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://pawpointers-api.tinconnect.com
```

### For Admin:
```bash
cd apps/admin
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://pawpointers-api.tinconnect.com
```

### For Dashboard:
```bash
cd apps/dashboard
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://pawpointers-api.tinconnect.com
```

## 🔍 Verify Current Configuration

Check each project's environment variables:
```bash
# Portal
vercel env ls --scope pawpointers-portal

# Admin
vercel env ls --scope pawpointers-admin

# Dashboard
vercel env ls --scope pawpointers-dashboard

# API Server
vercel env ls --scope pawpointers-api-server
```

## ⚠️ Critical: API Server Environment Variables

The API server (`pawpointers-api-server`) MUST have:

```
SUPABASE_URL=https://omczmkjrpsykpwiyptfj.supabase.co
SUPABASE_SERVICE_KEY=<your-service-role-key>
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Set these at: https://vercel.com/tindeveloper/pawpointers-api-server/settings/environment-variables

## 🧪 Test API Server

```bash
# Health check
curl https://pawpointers-api.tinconnect.com/health

# Categories endpoint
curl https://pawpointers-api.tinconnect.com/api/public/categories

# Featured listings
curl https://pawpointers-api.tinconnect.com/api/public/featured
```

If these return 500 errors, the API server needs environment variables set.


