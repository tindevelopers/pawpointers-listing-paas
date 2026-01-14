# Builder.io Configuration Guide

## Overview

Builder.io is configured for visual page editing in the portal app. This guide covers all configuration options and setup requirements.

## Required Configuration

### 1. Environment Variables

Set these environment variables in your `.env.local` file (for local development) and in Vercel (for production):

#### Required:
```bash
NEXT_PUBLIC_BUILDER_API_KEY=your-builder-api-key-here
```

**How to get your API key:**
1. Sign in to https://builder.io
2. Go to Account Settings → Space Settings
3. Copy your API Key

#### Optional:
```bash
# Builder.io Space ID (if using multiple spaces)
NEXT_PUBLIC_BUILDER_SPACE_ID=your-space-id

# Environment name (default: production)
NEXT_PUBLIC_BUILDER_ENVIRONMENT=production

# Enable preview mode for draft content (default: false, or true in development)
BUILDER_PREVIEW=false
```

### 2. Configuration File

The main configuration is in `builder.config.ts`:

```typescript
export const builderConfig = {
  apiKey: process.env.NEXT_PUBLIC_BUILDER_API_KEY || '',
  preview: process.env.NODE_ENV === 'development' || process.env.BUILDER_PREVIEW === 'true',
  model: 'page',  // Model name for pages
  spaceId: process.env.NEXT_PUBLIC_BUILDER_SPACE_ID,
  environment: process.env.NEXT_PUBLIC_BUILDER_ENVIRONMENT || 'production',
};
```

**Current Status:**
- ✅ Configuration file exists at `apps/portal/builder.config.ts`
- ✅ Integrated into `BuilderComponent.tsx`
- ✅ Integrated into `lib/builder.ts`
- ✅ Visual editing component exists (`components/builder/VisualEditing.tsx`)
- ✅ Component registration file exists (`components/builder/register-components.tsx`)

## Setup Checklist

### Local Development

- [ ] Create `.env.local` file in `apps/portal/` directory
- [ ] Add `NEXT_PUBLIC_BUILDER_API_KEY=your-key-here`
- [ ] Restart dev server: `pnpm dev`
- [ ] Verify API key is loaded (check console for warnings)

### Production (Vercel)

- [ ] Go to Vercel Dashboard → Settings → Environment Variables
- [ ] Add `NEXT_PUBLIC_BUILDER_API_KEY` with your API key
- [ ] Add optional variables if needed:
  - `NEXT_PUBLIC_BUILDER_SPACE_ID`
  - `NEXT_PUBLIC_BUILDER_ENVIRONMENT`
  - `BUILDER_PREVIEW`
- [ ] Redeploy the application

## How It Works

### 1. Page Routing

Builder.io pages are handled by the catch-all route `app/[...taxonomy]/page.tsx`:

- **Priority 1**: Checks for Builder.io content at the requested path
- **Priority 2**: Falls back to taxonomy-based routing if no Builder.io content exists

### 2. Component Loading

- `BuilderComponent.tsx`: Main component that renders Builder.io content
- Uses dynamic imports to prevent build-time errors
- Handles loading states and errors gracefully

### 3. Visual Editing

- `VisualEditing.tsx`: Enables visual editing overlay
- Automatically detects when opened from Builder.io editor
- Works when URL contains `builder.frameEditing=true` or `builder.preview=true`

### 4. Component Registration

- `register-components.tsx`: Register custom React components for use in Builder.io
- Currently commented out - uncomment and configure as needed
- See examples in the file for how to register components

## Usage

### Creating a Page in Builder.io

1. Go to https://builder.io
2. Click "New Page"
3. Set the URL path (e.g., `/about`, `/contact`)
4. Design your page using Builder.io's visual editor
5. Save and publish

### Opening Visual Editor

1. Start your dev server: `pnpm dev`
2. In Builder.io dashboard, open your page
3. Click "Open Visual Editor" button
4. Your portal will open with editing overlay enabled

### Accessing Builder.io Pages

Once published, Builder.io pages are automatically served at their configured URLs:
- Example: `/about` → Shows Builder.io content if it exists
- Falls back to taxonomy routing if no Builder.io content

## API Routes

### `/api/builder`

- **GET**: Health check endpoint
- **POST**: Webhook handler for Builder.io events
  - `content.publish`: Content was published
  - `content.unpublish`: Content was unpublished
  - `content.update`: Content was updated

**Setup webhook in Builder.io:**
1. Go to Builder.io → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/builder`
3. Select events to listen for

## Component Registration

To make your existing React components available in Builder.io:

1. Open `components/builder/register-components.tsx`
2. Import your component
3. Uncomment and configure the registration:

```typescript
import { ListingCard } from '@/components/listings/ListingCard';

builder.registerComponent(ListingCard, {
  name: 'ListingCard',
  description: 'Display a listing card',
  inputs: [
    {
      name: 'listing',
      type: 'object',
      required: true,
    },
  ],
});
```

## Troubleshooting

### Builder.io Not Loading

**Check:**
1. ✅ API key is set in `.env.local` or Vercel
2. ✅ Dev server is running
3. ✅ No console errors
4. ✅ API key is correct (check Builder.io dashboard)

**Debug:**
```bash
# Check if API key is loaded
curl http://localhost:3030/api/builder
# Should return: {"status":"ok","builderConfigured":true}
```

### Visual Editing Not Working

**Check:**
1. ✅ Page is published in Builder.io
2. ✅ URL matches exactly (case-sensitive)
3. ✅ Opening from Builder.io dashboard (not direct URL)
4. ✅ Browser console for errors

### Build Errors

If you see build errors related to Builder.io:
- ✅ Builder.io imports are now lazy-loaded (fixed)
- ✅ Dynamic imports prevent build-time errors
- ✅ Check that `@builder.io/react` is installed: `pnpm list @builder.io/react`

## Current Configuration Status

| Component | Status | Location |
|-----------|--------|----------|
| Config File | ✅ Configured | `builder.config.ts` |
| Main Component | ✅ Configured | `components/builder/BuilderComponent.tsx` |
| Visual Editing | ✅ Configured | `components/builder/VisualEditing.tsx` |
| Component Registration | ⚠️ Needs Setup | `components/builder/register-components.tsx` |
| API Routes | ✅ Configured | `app/api/builder/route.ts` |
| Page Routing | ✅ Configured | `app/[...taxonomy]/page.tsx` |
| Builder Utilities | ✅ Configured | `lib/builder.ts` |

## Next Steps

1. **Set API Key**: Add `NEXT_PUBLIC_BUILDER_API_KEY` to your environment
2. **Test Connection**: Visit `/api/builder` to verify configuration
3. **Create First Page**: Create a test page in Builder.io
4. **Register Components** (Optional): Uncomment and configure component registration
5. **Set Up Webhooks** (Optional): Configure webhooks in Builder.io dashboard

## Resources

- [Builder.io Docs](https://www.builder.io/c/docs)
- [Visual Editing Guide](https://www.builder.io/c/docs/visual-editing)
- [Custom Components](https://www.builder.io/c/docs/custom-react-components)
- [Webhooks](https://www.builder.io/c/docs/webhooks)

