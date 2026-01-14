# Builder.io Integration Setup

## Overview

Builder.io has been successfully integrated into the portal app. This allows you to create and edit pages visually using Builder.io's drag-and-drop editor while maintaining existing React components.

## Architecture

The integration uses a hybrid approach where Builder.io pages coexist with existing Next.js routes:

- **Builder.io pages**: Created in Builder.io visual editor, rendered via catch-all route `[[...page]]`
- **Existing pages**: Continue to work as before (e.g., `/listings`, `/categories`, etc.)

## Files Created

### Configuration
- `builder.config.ts` - Builder.io configuration and settings

### Components
- `components/builder/BuilderComponent.tsx` - Builder.io content renderer wrapper
- `components/builder/register-components.tsx` - Component registration for visual editor

### API Routes
- `app/api/builder/route.ts` - Builder.io webhook handler
- `app/api/builder/preview/route.ts` - Preview mode endpoint

### Pages
- `app/[[...page]]/page.tsx` - Catch-all route for Builder.io pages

### Utilities
- `lib/builder.ts` - Helper functions for Builder.io content

## Setup Instructions

### 1. Get Builder.io API Key

1. Sign up at https://builder.io
2. Create a new space (or use existing)
3. Go to Account Settings → API Keys
4. Copy your Public API Key

### 2. Set Environment Variables

Add to your `.env.local` (for local development):

```bash
NEXT_PUBLIC_BUILDER_API_KEY=your-builder-api-key-here
```

For Vercel deployment, add to Vercel Dashboard → Settings → Environment Variables:
- `NEXT_PUBLIC_BUILDER_API_KEY` - Your Builder.io API key
- `NEXT_PUBLIC_BUILDER_SPACE_ID` - (Optional) Your Builder.io space ID
- `NEXT_PUBLIC_BUILDER_ENVIRONMENT` - (Optional) Environment name (default: production)
- `BUILDER_PREVIEW` - (Optional) Enable preview mode (true/false)

### 3. Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
cd apps/portal
pnpm install
```

### 4. Run Builder.io CLI (Optional)

To set up Builder.io CLI for easier content management:

```bash
cd apps/portal
npx @builder.io/cli init
```

This will:
- Create Builder.io configuration files
- Set up initial component structure
- Generate API route stubs (already created)

## Usage

### Creating Pages in Builder.io

1. Go to https://builder.io
2. Create a new page
3. Set the URL path (e.g., `/about`, `/contact`)
4. Design your page using Builder.io's visual editor
5. Publish the page

### Accessing Builder.io Pages

Once published, Builder.io pages are accessible at their configured URLs:
- Example: If you create a page with URL `/about`, it will be available at `https://yourdomain.com/about`

### Preview Mode

To preview draft content:
- Add `?preview=true` to the URL
- Or use the preview endpoint: `/api/builder/preview?url=/your-page-path`

### Registering Custom Components

To use existing portal components in Builder.io:

1. Open `components/builder/register-components.tsx`
2. Uncomment and configure the component registrations
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

## How It Works

### Route Priority

The catch-all route `[[...page]]` handles routing as follows:

1. **Check Builder.io**: First checks if Builder.io has content for the path
2. **Render Builder.io**: If content exists, renders Builder.io page
3. **Fallback to Next.js**: If no Builder.io content, Next.js handles normal routing
4. **404**: If route doesn't exist in either, shows 404

This ensures:
- Builder.io pages work seamlessly
- Existing Next.js pages continue to work
- No conflicts between the two systems

### Component Registration

Components registered in `register-components.tsx` become available in Builder.io's visual editor:
- Drag and drop components onto pages
- Configure component props visually
- Use existing portal components in Builder.io pages

## Testing

### Test Builder.io Integration

1. **Create a test page**:
   - Go to Builder.io dashboard
   - Create a new page with URL `/test-builder`
   - Add some content
   - Publish

2. **Verify it works**:
   - Visit `http://localhost:3030/test-builder`
   - Should see your Builder.io content

3. **Test existing pages**:
   - Visit `http://localhost:3030/listings`
   - Should still work as before

### Test Preview Mode

1. Create a draft page in Builder.io
2. Visit: `http://localhost:3030/api/builder/preview?url=/your-draft-page`
3. Should show draft content

## Troubleshooting

### Builder.io Content Not Showing

1. **Check API Key**: Ensure `NEXT_PUBLIC_BUILDER_API_KEY` is set correctly
2. **Check URL**: Verify the page URL in Builder.io matches the route
3. **Check Console**: Look for errors in browser console
4. **Check Logs**: Check server logs for Builder.io API errors

### Existing Pages Not Working

- The catch-all route only triggers if Builder.io content exists
- If Builder.io content doesn't exist, Next.js handles routing normally
- Check that your existing routes are still in place

### Component Registration Issues

- Ensure components are imported correctly
- Check that Builder.io API key is configured
- Verify component props match Builder.io input types

## Next Steps

1. **Get Builder.io API Key** and set environment variable
2. **Create your first Builder.io page** in the Builder.io dashboard
3. **Register custom components** as needed for your use case
4. **Test the integration** with both Builder.io and existing pages

## Resources

- [Builder.io Documentation](https://www.builder.io/c/docs)
- [Builder.io React SDK](https://www.builder.io/c/docs/developers/react)
- [Builder.io Component Registration](https://www.builder.io/c/docs/custom-react-components)
- [Builder.io Webhooks](https://www.builder.io/c/docs/webhooks)

## Support

For Builder.io-specific issues:
- Builder.io Support: https://builder.io/help
- Builder.io Community: https://forum.builder.io

For integration issues:
- Check the code comments in created files
- Review Builder.io React SDK documentation

