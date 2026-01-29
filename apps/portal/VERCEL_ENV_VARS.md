# Vercel Environment Variables for Portal

## Required Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables for the `pawpointers-portal` project:

### API Configuration
```
NEXT_PUBLIC_API_URL=https://pawpointers-api.tinconnect.com
# API endpoint for featured accounts: /api/public/accounts/featured
```

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://gakuwocsamrqcplrxvmh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdha3V3b2NzYW1ycWNwbHJ4dm1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjU4NzMsImV4cCI6MjA4NDYwMTg3M30.83Ka_MlIYx_oR2V5FaF0b1G7J_hmmaCq3WwvtFl39p0
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Staff Supabase Routing/Policy Store (server-only, non-secret config)

Portal reads **provider routing/policies** (non-secret) from the Staff Supabase control plane.

```
STAFF_SUPABASE_URL=<your-staff-supabase-url>
STAFF_SUPABASE_SERVICE_ROLE_KEY=<your-staff-supabase-service-role-key>
```

### Builder.io Configuration (Optional)

```
NEXT_PUBLIC_BUILDER_API_KEY=<your-builder-api-key>
NEXT_PUBLIC_BUILDER_SPACE_ID=<your-builder-space-id>
NEXT_PUBLIC_BUILDER_ENVIRONMENT=production
BUILDER_PREVIEW=false
```

**Note:** Get your Builder.io API key from https://builder.io/account/space

### AI Configuration
```
# Preferred: Vercel AI Gateway
AI_GATEWAY_URL=<your-gateway-url>
AI_GATEWAY_API_KEY=<your-gateway-key>
AI_MODEL=openai/gpt-4.1
EMBEDDING_MODEL=openai/text-embedding-3-small

# Fallback (if no gateway)
OPENAI_API_KEY=<optional-fallback>
```

### Optional Environment Variables

```
NEXT_PUBLIC_SITE_URL=https://your-portal-domain.com
REVALIDATION_SECRET=<your-revalidation-secret>
```

### Impersonation (verification; server-only)

Used to verify admin-issued impersonation tokens in `/impersonate`:

```
IMPERSONATION_JWT_SECRET=<shared-with-admin>
```

## How to Set Environment Variables in Vercel

1. Go to https://vercel.com/tindeveloper/pawpointers-portal/settings/environment-variables
2. Add each variable above
3. Select environments: Production, Preview, Development
4. Click "Save"
5. Redeploy the application

## Testing the API

The portal uses the following API endpoints:
- `/api/public/featured` - Featured listings
- `/api/public/categories` - Categories list
- `/api/public/listings` - Listings search
- `/api/public/listings/slug/{slug}` - Single listing by slug
- `/api/public/knowledge-base` - Knowledge base articles
- `/api/public/sitemap` - Sitemap data

Make sure CORS is configured on the API to allow requests from your portal domain.

