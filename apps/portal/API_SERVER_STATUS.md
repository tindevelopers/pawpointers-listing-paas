# API Server Status

## Current Status: DEPROVISIONED ✅

The external API server (`https://pawpointers-api.tinconnect.com`) has been **deprovisioned**. All API calls have been migrated to use **Supabase directly** or gracefully stub out with fallbacks.

## Migration Summary

### ✅ Migrated to Supabase

1. **Listings** (`lib/listings.ts`)
   - ✅ Already using Supabase directly
   - ✅ No API dependency

2. **Taxonomy** (`lib/taxonomy.ts`)
   - ✅ Migrated to use Supabase via `getListingBySlug()` and `searchListings()`
   - ✅ Graceful fallbacks for taxonomy terms
   - ✅ Stub implementation for child terms

3. **Knowledge Base** (`lib/knowledge-base.ts`)
   - ✅ Migrated to use Supabase `knowledge_documents` table
   - ✅ All functions now query Supabase directly
   - ✅ Graceful fallbacks if Supabase unavailable

4. **Sitemap** (`app/sitemap.ts`)
   - ✅ Migrated to use Supabase `public_listings_view`
   - ✅ Generates sitemap from Supabase data

### Configuration

All modules now have a `USE_API` flag that can be set to `true` if the API server is provisioned later:

```typescript
const USE_API = false; // Set to true if API server is provisioned later
```

## Files Modified

- `apps/portal/lib/taxonomy.ts` - Uses Supabase instead of API
- `apps/portal/lib/knowledge-base.ts` - Uses Supabase instead of API
- `apps/portal/app/sitemap.ts` - Uses Supabase instead of API
- `apps/portal/vercel.json` - Removed API rewrite rule

## Environment Variables

The `NEXT_PUBLIC_API_URL` environment variable is **no longer required** but can be kept for future use:

```bash
# Optional - only needed if API server is provisioned later
NEXT_PUBLIC_API_URL=https://pawpointers-api.tinconnect.com
```

## Re-provisioning API Server (Future)

If you need to re-provision the API server later:

1. Set `USE_API = true` in:
   - `lib/taxonomy.ts`
   - `lib/knowledge-base.ts`
   - `app/sitemap.ts`

2. Update `vercel.json` rewrite rule:
   ```json
   {
     "source": "/api/v1/:path*",
     "destination": "https://your-api-domain.com/api/:path*"
   }
   ```

3. Set `NEXT_PUBLIC_API_URL` environment variable in Vercel

## Current Behavior

- ✅ All data fetching uses Supabase directly
- ✅ No external API dependencies
- ✅ Graceful error handling with fallbacks
- ✅ No breaking changes to component interfaces

## Testing

To verify the migration:

1. **Listings**: Visit `/listings` - should load from Supabase
2. **Taxonomy**: Visit `/categories/[category]` - should load from Supabase
3. **Knowledge Base**: Visit any KB page - should load from Supabase
4. **Sitemap**: Visit `/sitemap.xml` - should generate from Supabase

All should work without the API server.

