# Vercel Environment Variables for Portal

## Required Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables for the `pawpointers-portal` project:

### API Configuration
```
NEXT_PUBLIC_API_URL=https://pawpointers-api.tinconnect.com
```

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://omczmkjrpsykpwiyptfj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tY3pta2pycHN5a3B3aXlwdGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5ODIyMjMsImV4cCI6MjA4MzU1ODIyM30.JZnXOYmO-fxR1i9ak13_TKqXLBF40ETHHr0P26hqd5s
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Optional Environment Variables

```
NEXT_PUBLIC_SITE_URL=https://your-portal-domain.com
REVALIDATION_SECRET=<your-revalidation-secret>
OPENAI_API_KEY=<if-using-chat-features>
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

