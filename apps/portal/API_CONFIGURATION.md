# API Configuration for Portal

## API Endpoint

The portal is configured to use the following API:

**Production API:** `https://pawpointers-api.tinconnect.com`

## Environment Variables

### Local Development (.env.local)
```
NEXT_PUBLIC_API_URL=https://pawpointers-api.tinconnect.com
```

### Vercel Deployment
The environment variable has been set in Vercel:
- **Project:** `pawpointers-portal`
- **Variable:** `NEXT_PUBLIC_API_URL`
- **Value:** `https://pawpointers-api.tinconnect.com`
- **Environments:** Production, Preview

## API Endpoints Used

The portal uses the following public API endpoints:

1. **Featured Listings**
   - Endpoint: `/api/public/featured?limit={limit}`
   - Used in: Homepage featured section
   - Method: GET

2. **Categories**
   - Endpoint: `/api/public/categories`
   - Used in: Navigation, homepage categories section
   - Method: GET

3. **Listings Search**
   - Endpoint: `/api/public/listings?{query params}`
   - Used in: Search results, listings page
   - Method: GET

4. **Single Listing**
   - Endpoint: `/api/public/listings/slug/{slug}`
   - Used in: Listing detail pages
   - Method: GET

5. **Taxonomy Paths**
   - Endpoint: `/api/public/taxonomy/{termSlug}`
   - Used in: Dynamic taxonomy routing
   - Method: GET

6. **Sitemap Data**
   - Endpoint: `/api/public/sitemap?limit={limit}`
   - Used in: Sitemap generation
   - Method: GET

7. **Knowledge Base**
   - Endpoint: `/api/public/knowledge-base`
   - Used in: Knowledge base pages
   - Method: GET

## Error Handling

All API calls include error handling:
- Failed requests return empty arrays/objects
- Pages render gracefully even if API is unavailable
- Errors are logged to console for debugging

## CORS Configuration

Ensure the API server allows requests from:
- Portal domain (production)
- Vercel preview domains (`*.vercel.app`)
- Local development (`http://localhost:3030`)

Update the API's `ALLOWED_ORIGINS` environment variable to include:
```
https://your-portal-domain.com,https://*.vercel.app,http://localhost:3030
```

## Testing

To test the API connection locally:
```bash
cd apps/portal
NEXT_PUBLIC_API_URL=https://pawpointers-api.tinconnect.com pnpm dev
```

## Deployment Status

✅ Environment variable configured in Vercel
✅ Local .env.local updated
✅ Error handling implemented
✅ Dynamic rendering enabled to prevent build failures

## Next Steps

1. Verify API CORS configuration includes portal domain
2. Test API endpoints return expected data format
3. Monitor deployment logs for any API connection issues
4. Update API response format if needed to match portal expectations

