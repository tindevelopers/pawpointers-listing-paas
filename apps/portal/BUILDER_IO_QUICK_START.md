# Builder.io Quick Start Guide

## ✅ API Key Configured

Your Builder.io API key has been set up in `.env.local`:
- **API Key**: `5a52d82defcf479eb265bdbda490769e`
- **Status**: Ready to use

## Next Steps

### 1. Start Development Server

```bash
cd apps/portal
pnpm dev
```

The portal will start on `http://localhost:3030`

### 2. Create Your First Builder.io Page

1. Go to https://builder.io
2. Sign in to your account
3. Click "New Page" or "Create Page"
4. Set the URL path (e.g., `/about`, `/test-page`)
5. Design your page using the visual editor
6. Click "Publish"

### 3. View Your Builder.io Page

Once published, visit your page at:
- `http://localhost:3030/your-page-path`

For example, if you created a page with URL `/about`:
- `http://localhost:3030/about`

### 4. Test Preview Mode

To preview draft content before publishing:
- Add `?preview=true` to the URL
- Example: `http://localhost:3030/about?preview=true`

## Verification

### Check Builder.io Integration

1. **API Route Health Check**:
   ```
   http://localhost:3030/api/builder
   ```
   Should return: `{"status":"ok","builderConfigured":true}`

2. **Test Preview Endpoint**:
   ```
   http://localhost:3030/api/builder/preview?url=/test-page
   ```
   Returns Builder.io content if it exists

### Common Issues

**Issue**: Builder.io content not showing
- **Solution**: Make sure the page URL in Builder.io matches the route exactly
- Check browser console for errors
- Verify API key is correct

**Issue**: "Builder.io API key is not configured"
- **Solution**: Restart the dev server after adding `.env.local`
- Ensure `.env.local` is in `apps/portal/` directory

**Issue**: Existing pages not working
- **Solution**: This is normal - Builder.io only handles pages it has content for
- Existing Next.js routes continue to work as before

## Using Custom Components

To use your existing portal components in Builder.io:

1. Open `components/builder/register-components.tsx`
2. Uncomment and configure component registrations
3. Example:

```typescript
import { ListingCard } from '@/components/listings/ListingCard';

builder.registerComponent(ListingCard, {
  name: 'ListingCard',
  inputs: [
    { name: 'listing', type: 'object', required: true },
  ],
});
```

4. Restart dev server
5. Components will appear in Builder.io's component library

## Resources

- **Builder.io Dashboard**: https://builder.io
- **Documentation**: https://www.builder.io/c/docs
- **React SDK Docs**: https://www.builder.io/c/docs/developers/react
- **Component Registration**: https://www.builder.io/c/docs/custom-react-components

## Support

- Builder.io Support: https://builder.io/help
- Integration Guide: See `BUILDER_IO_SETUP.md`

