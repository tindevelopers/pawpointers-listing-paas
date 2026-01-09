# Domain Security Issue: Source Code Exposure

## 🚨 CRITICAL SECURITY ISSUE

**Domain:** `pawpointers-api.tinconnect.com`  
**Problem:** Serving raw TypeScript source code (`src/index.ts`)  
**Risk Level:** HIGH - API structure, routes, and configuration exposed

## Current Status

- ✅ Domain IS assigned to `pawpointers-api-server` project
- ❌ Root path (`/`) serves `src/index.ts` as static file
- ❌ API endpoints return 500 errors
- ❌ Source code is publicly accessible

## Why This Happens

The domain is serving source files instead of the API function. Possible causes:

1. **Vercel serving static files** - `src/` directory being exposed
2. **Wrong deployment** - Domain pointing to old/cached deployment
3. **Routing misconfiguration** - Rewrite rules not taking effect
4. **GitHub integration** - Domain might be pointing to GitHub repo

## Fixes Applied

### 1. Added Root Path Handler
```typescript
// api/index.ts
app.get('/', (c) => {
  return c.json({
    service: 'pawpointers-api-server',
    version: '1.0.0',
    status: 'ok',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      public: '/api/public',
    },
  });
});
```

### 2. Created .vercelignore
Prevents source files from being deployed:
```
src/**
*.md
node_modules/**
.git/**
.env*
```

### 3. Updated vercel.json
Explicit routing for root path:
```json
{
  "rewrites": [
    {
      "source": "/",
      "destination": "/api/index"
    },
    {
      "source": "/(.*)",
      "destination": "/api/index"
    }
  ]
}
```

## Manual Fix Steps

### Step 1: Verify Domain Assignment

1. Go to: https://vercel.com/tindeveloper/pawpointers-api-server/settings/domains
2. Verify `pawpointers-api.tinconnect.com` is listed
3. If not, add it manually

### Step 2: Check Domain Configuration

```bash
cd packages/api-server
vercel domains inspect pawpointers-api.tinconnect.com
```

### Step 3: Force Domain Update

If domain is assigned but serving wrong content:

1. **Remove and re-add domain:**
   ```bash
   vercel domains remove pawpointers-api.tinconnect.com
   vercel domains add pawpointers-api.tinconnect.com
   ```

2. **Or update in dashboard:**
   - Remove domain
   - Wait 5 minutes
   - Re-add domain
   - Point to latest deployment

### Step 4: Clear Cache

Vercel may be caching the old response:

1. Go to deployment settings
2. Clear cache
3. Or redeploy with cache-busting

### Step 5: Verify DNS

Ensure DNS points to Vercel:

```bash
dig pawpointers-api.tinconnect.com
# Should show Vercel nameservers or CNAME to Vercel
```

## Expected Behavior After Fix

✅ **Root path (`/`):**
```json
{
  "service": "pawpointers-api-server",
  "version": "1.0.0",
  "status": "ok",
  "endpoints": { ... }
}
```

✅ **Health endpoint (`/health`):**
```json
{
  "status": "ok",
  "timestamp": "...",
  "service": "api-server"
}
```

❌ **NOT source code** - This should never be visible

## Temporary Workaround

Until domain is fixed, use Vercel URLs:

- ✅ https://pawpointers-api-server-tindeveloper.vercel.app
- ✅ https://api-server-three-theta.vercel.app

Update frontend apps to use these URLs temporarily.

## Security Impact

**Exposed Information:**
- All API routes and endpoints
- Middleware configuration
- Import structure
- Environment variable usage patterns

**Recommendations:**
1. ✅ Fix domain immediately (this guide)
2. ✅ Rotate any exposed secrets/keys
3. ✅ Review API security after fix
4. ✅ Add rate limiting
5. ✅ Enable authentication for sensitive endpoints

## Verification

After applying fixes, test:

```bash
# Should return JSON, NOT source code
curl https://pawpointers-api.tinconnect.com/

# Should return health check
curl https://pawpointers-api.tinconnect.com/health

# Should NOT return source code
curl https://pawpointers-api.tinconnect.com/src/index.ts
```

## Next Steps

1. ✅ Fixes applied in code (committed)
2. ⏳ Deploy new version (done)
3. ⏳ Verify domain configuration (manual check needed)
4. ⏳ Wait for DNS propagation (5-60 minutes)
5. ⏳ Test domain endpoints
6. ⏳ Update frontend apps once domain works

