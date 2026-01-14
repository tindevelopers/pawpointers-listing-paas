# Vercel API Server Setup - Manual Steps Required

## ✅ Completed

1. ✅ **Build Errors Fixed** - All TypeScript errors resolved
2. ✅ **Correct Project Identified** - `pawpointers-api-server` 
3. ✅ **Environment Variables Set** - Using Supabase CLI credentials:
   - `SUPABASE_URL` ✅
   - `SUPABASE_SERVICE_KEY` ✅  
   - `SUPABASE_ANON_KEY` ✅
   - `NEXT_PUBLIC_API_URL` ✅

## ⚠️ Action Required: Fix Vercel Project Settings

The deployment is failing because Vercel project settings need to be updated manually.

### Step 1: Update Project Settings

Go to: **https://vercel.com/tindeveloper/pawpointers-api-server/settings**

Update these settings:

1. **Root Directory:** `packages/api-server` ✅ (already correct)

2. **Build Command:** Change from `pnpm build` to:
   ```
   cd ../.. && pnpm turbo build --filter=@listing-platform/api-server
   ```

3. **Output Directory:** Change from `dist` to:
   ```
   . (empty or dot)
   ```
   OR leave it empty

4. **Install Command:** Should be:
   ```
   cd ../.. && pnpm install --frozen-lockfile
   ```
   ✅ (already correct)

### Step 2: Verify Environment Variables

Go to: **https://vercel.com/tindeveloper/pawpointers-api-server/settings/environment-variables**

Verify these are set for **Production, Preview, Development**:

- ✅ `SUPABASE_URL` = `https://omczmkjrpsykpwiyptfj.supabase.co`
- ✅ `SUPABASE_SERVICE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (service_role key)
- ✅ `SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (anon key)
- ✅ `NEXT_PUBLIC_API_URL` = `https://pawpointers-api.tinconnect.com`

### Step 3: Redeploy

After updating settings, trigger a redeploy:

**Option A: Via Dashboard**
1. Go to: https://vercel.com/tindeveloper/pawpointers-api-server/deployments
2. Click "Redeploy" on latest deployment

**Option B: Via CLI** (after settings are fixed)
```bash
cd packages/api-server
vercel --prod --yes
```

### Step 4: Test API

```bash
# Health check
curl https://pawpointers-api.tinconnect.com/health

# Categories
curl https://pawpointers-api.tinconnect.com/api/public/categories

# Featured listings  
curl https://pawpointers-api.tinconnect.com/api/public/featured
```

## 🔍 Current Issue

The deployment error shows:
```
Error: The provided path "packages/api-server/packages/api-server" does not exist
```

This happens because:
- Root Directory is set to `packages/api-server` ✅
- But Vercel is doubling the path when deploying

**Fix:** Update Build Command and Output Directory as shown above, then redeploy.

## 📋 All Apps Configuration

### Portal ✅
- Points to: `https://pawpointers-api.tinconnect.com`
- Env var: `NEXT_PUBLIC_API_URL`

### Admin ⚠️
- Should point to: `https://pawpointers-api.tinconnect.com`
- Verify: `NEXT_PUBLIC_API_URL` is set in Vercel

### Dashboard ⚠️
- Should point to: `https://pawpointers-api.tinconnect.com`
- Verify: `NEXT_PUBLIC_API_URL` is set in Vercel

## 🎯 Summary

- ✅ Code is fixed and builds successfully
- ✅ Environment variables are set
- ⚠️ **Need to update Build Command and Output Directory in Vercel Dashboard**
- ⚠️ Then redeploy

Once the project settings are updated and redeployed, the API should work correctly!

