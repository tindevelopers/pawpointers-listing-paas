# ✅ Correct API Server Setup

## 🎯 Correct API Server Project

**Project Name:** `pawpointers-api-server`  
**Domain:** `https://pawpointers-api.tinconnect.com`  
**Vercel Project:** `tindeveloper/pawpointers-api-server`  
**Root Directory:** `packages/api-server`

## ⚠️ Wrong Project (DO NOT USE)

**Project Name:** `api-server`  
**Domain:** None (no custom domain)  
**Status:** ❌ Wrong project - ignore this one

## 🔧 All Apps Must Point To

```
NEXT_PUBLIC_API_URL=https://pawpointers-api.tinconnect.com
```

## 📋 Apps Configuration Status

### ✅ Portal (`pawpointers-portal`)
- **Status:** ✅ Configured
- **Environment Variable:** `NEXT_PUBLIC_API_URL=https://pawpointers-api.tinconnect.com`
- **Files Using API:**
  - `apps/portal/lib/listings.ts`
  - `apps/portal/lib/taxonomy.ts`
  - `apps/portal/lib/knowledge-base.ts`

### ⚠️ Admin (`pawpointers-admin`)
- **Status:** ⚠️ Needs verification
- **Environment Variable:** Should be `NEXT_PUBLIC_API_URL=https://pawpointers-api.tinconnect.com`
- **Files Using API:**
  - `apps/admin/app/saas/support/knowledge-base/page.tsx`
  - Other booking/integration pages

### ⚠️ Dashboard (`pawpointers-dashboard`)
- **Status:** ⚠️ Needs verification
- **Environment Variable:** Should be `NEXT_PUBLIC_API_URL=https://pawpointers-api.tinconnect.com`

## 🚀 Setting Environment Variables

### For API Server (`pawpointers-api-server`):

**Critical Variables:**
```bash
SUPABASE_URL=https://omczmkjrpsykpwiyptfj.supabase.co
SUPABASE_SERVICE_KEY=<your-service-role-key>
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Set in Vercel:**
1. Go to: https://vercel.com/tindeveloper/pawpointers-api-server/settings/environment-variables
2. Add each variable
3. Select: Production, Preview, Development
4. Save and redeploy

### For Portal:
```bash
vercel env add NEXT_PUBLIC_API_URL production --scope pawpointers-portal
# Enter: https://pawpointers-api.tinconnect.com
```

### For Admin:
```bash
vercel env add NEXT_PUBLIC_API_URL production --scope pawpointers-admin
# Enter: https://pawpointers-api.tinconnect.com
```

### For Dashboard:
```bash
vercel env add NEXT_PUBLIC_API_URL production --scope pawpointers-dashboard
# Enter: https://pawpointers-api.tinconnect.com
```

## 🔍 Verify Configuration

```bash
# Check API server is linked correctly
cd packages/api-server
cat .vercel/project.json
# Should show: "projectName": "pawpointers-api-server"

# Check environment variables
vercel env ls --scope pawpointers-api-server

# Test API
curl https://pawpointers-api.tinconnect.com/health
```

## 🐛 Current Issue

The API server is returning 500 errors because:
- ❌ Missing `SUPABASE_SERVICE_KEY` environment variable
- ❌ Function invocation is failing

**Fix:** Set environment variables in `pawpointers-api-server` project and redeploy.

## 📝 Deployment Command

```bash
# Deploy to correct project
cd packages/api-server
vercel --prod --yes

# Verify deployment
curl https://pawpointers-api.tinconnect.com/health
```

