# API Server Configuration for Frontend Apps

## API Server URLs

### Production API Server
- **Vercel URL:** https://pawpointers-api-server-tindeveloper.vercel.app
- **Custom Domain:** https://pawpointers-api.tinconnect.com (should respond)
- **Health Check:** https://pawpointers-api.tinconnect.com/health

### Alternative URLs
- https://api-server-three-theta.vercel.app (also available)

## Frontend Apps That Need the API

### 1. Admin App
- **Vercel URL:** https://admin-beryl-two.vercel.app
- **Project:** `pawpointers-admin`
- **Root Directory:** `apps/admin`
- **Environment Variable Needed:** `NEXT_PUBLIC_API_URL=https://pawpointers-api.tinconnect.com`

### 2. Portal App
- **Vercel URL:** https://pawpointers-portal-tindeveloper.vercel.app
- **Project:** `pawpointers-portal`
- **Root Directory:** `apps/portal`
- **Environment Variable Needed:** `NEXT_PUBLIC_API_URL=https://pawpointers-api.tinconnect.com`

### 3. Dashboard App
- **Vercel URL:** https://dashboard-xi-one-66.vercel.app
- **Project:** `pawpointers-dashboard`
- **Root Directory:** `apps/dashboard`
- **Environment Variable Needed:** `NEXT_PUBLIC_API_URL=https://pawpointers-api.tinconnect.com`

## Configuration Steps

### Step 1: Verify API Domain

Check if `pawpointers-api.tinconnect.com` is configured:

```bash
# Test health endpoint
curl https://pawpointers-api.tinconnect.com/health

# Should return:
# {"status":"ok","timestamp":"...","service":"api-server"}
```

### Step 2: Update Frontend Apps

For each frontend app (admin, portal, dashboard), set the environment variable:

**In Vercel Dashboard:**
1. Go to project settings → Environment Variables
2. Add/Update: `NEXT_PUBLIC_API_URL`
3. Value: `https://pawpointers-api.tinconnect.com`
4. Apply to: Production, Preview, Development

**Or via CLI:**
```bash
# Admin
cd apps/admin
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://pawpointers-api.tinconnect.com

# Portal
cd apps/portal
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://pawpointers-api.tinconnect.com

# Dashboard
cd apps/dashboard
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://pawpointers-api.tinconnect.com
```

### Step 3: Verify Configuration

After updating, redeploy each app:

```bash
# Admin
cd apps/admin && vercel deploy --prod

# Portal
cd apps/portal && vercel deploy --prod

# Dashboard
cd apps/dashboard && vercel deploy --prod
```

## API Endpoints

The API server provides these endpoints:

- `/health` - Health check
- `/api/auth/*` - Authentication routes
- `/api/public/*` - Public routes
- `/api/listings/*` - Listing routes (if configured)
- `/api/bookings/*` - Booking routes (if configured)
- `/api/contacts/*` - Contact routes (if configured)
- `/api/companies/*` - Company routes (if configured)

## Troubleshooting

### API Domain Not Responding

If `pawpointers-api.tinconnect.com` returns 500 or doesn't respond:

1. **Check Vercel Domain Configuration:**
   ```bash
   cd packages/api-server
   vercel domains ls
   vercel domains add pawpointers-api.tinconnect.com
   ```

2. **Verify DNS Settings:**
   - Check DNS records point to Vercel
   - CNAME: `pawpointers-api.tinconnect.com` → `cname.vercel-dns.com`

3. **Check API Server Status:**
   ```bash
   curl https://pawpointers-api-server-tindeveloper.vercel.app/health
   ```

### CORS Errors

If frontend apps get CORS errors:

1. **Update API Server Environment:**
   ```bash
   cd packages/api-server
   vercel env add ALLOWED_ORIGINS production
   # Enter: https://admin-beryl-two.vercel.app,https://pawpointers-portal-tindeveloper.vercel.app,https://dashboard-xi-one-66.vercel.app
   ```

2. **Redeploy API Server:**
   ```bash
   cd packages/api-server
   vercel deploy --prod
   ```

## Quick Links

- **API Health:** https://pawpointers-api.tinconnect.com/health
- **Admin:** https://admin-beryl-two.vercel.app
- **Portal:** https://pawpointers-portal-tindeveloper.vercel.app
- **Dashboard:** https://dashboard-xi-one-66.vercel.app

