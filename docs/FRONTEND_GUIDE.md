# Frontend Development Guide

Complete guide for building listing platform frontends using Next.js and SDK components.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Tailwind Setup](#tailwind-setup)
4. [Using SDK Components](#using-sdk-components)
5. [Customization Levels](#customization-levels)
6. [Theme Customization](#theme-customization)
7. [Component Variants](#component-variants)
8. [Turborepo Integration](#turborepo-integration)
9. [Best Practices](#best-practices)

## Quick Start

```bash
# Install packages
pnpm add @listing-platform/design-tokens
pnpm add @listing-platform/reviews
pnpm add @listing-platform/maps
pnpm add @listing-platform/booking

# Configure Tailwind (see below)
# Use components in your app
```

## Installation

### Required Packages

```bash
# Design tokens (required for styling)
pnpm add @listing-platform/design-tokens

# SDK packages (install as needed)
pnpm add @listing-platform/reviews
pnpm add @listing-platform/maps
pnpm add @listing-platform/booking
pnpm add @listing-platform/crm
```

### Peer Dependencies

```bash
# React (required)
pnpm add react@^18.0.0 react-dom@^18.0.0

# Tailwind CSS (required for styled components)
pnpm add tailwindcss@^3.0.0
pnpm add autoprefixer@^10.0.0
pnpm add postcss@^8.0.0

# Utilities (recommended)
pnpm add clsx tailwind-merge
```

## Tailwind Setup

### 1. Create Tailwind Config

```javascript
// tailwind.config.js
const designTokens = require('@listing-platform/design-tokens/tailwind.config');

module.exports = {
  presets: [designTokens], // Use design tokens as base
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    // Include SDK components
    './node_modules/@listing-platform/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Your custom theme overrides
      colors: {
        brand: {
          primary: '#your-color',
        },
      },
    },
  },
};
```

### 2. Import Design Tokens CSS

```typescript
// app/layout.tsx or globals.css
import '@listing-platform/design-tokens/styles/tokens.css';
import './globals.css';
```

### 3. Configure PostCSS

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

## Using SDK Components

### Level 1: Use As-Is (Quick Start)

```typescript
import { ReviewsList, ReviewForm } from '@listing-platform/reviews';
import { Map } from '@listing-platform/maps';
import { BookingWidget } from '@listing-platform/booking';

export default function ListingPage({ params }) {
  const { id } = params;
  
  return (
    <div>
      <ReviewsList listingId={id} />
      <Map center={[lat, lng]} />
      <BookingWidget listingId={id} />
    </div>
  );
}
```

### Level 2: Customize with Props

```typescript
<ReviewsList 
  listingId="123"
  variant="compact"
  className="my-custom-class"
  filters={{
    minRating: 4,
    sortBy: 'date',
    limit: 10,
  }}
/>
```

### Level 3: Use Headless Components

```typescript
import { ReviewsListHeadless } from '@listing-platform/reviews/headless';

<ReviewsListHeadless
  listingId="123"
  renderReview={(review) => (
    <YourCustomCard review={review} />
  )}
  renderEmpty={() => <YourEmptyState />}
/>
```

### Level 4: Use Hooks Only

```typescript
import { useReviews } from '@listing-platform/reviews/hooks';

function YourComponent() {
  const { reviews, isLoading } = useReviews('123');
  
  return (
    <YourCustomUI>
      {reviews.map(review => (
        <YourCustomCard key={review.id} review={review} />
      ))}
    </YourCustomUI>
  );
}
```

## Customization Levels

### When to Use Each Level

**Level 1 (As-Is):**
- Quick prototyping
- MVP development
- Standard use cases
- Time-constrained projects

**Level 2 (Props):**
- Need minor customization
- Want to use variants
- Need filtering/sorting
- Brand colors match design tokens

**Level 3 (Headless):**
- Custom design requirements
- Brand guidelines don't match tokens
- Need unique layouts
- Want full control over styling

**Level 4 (Hooks):**
- Building completely custom UI
- Integrating with existing design system
- Need maximum flexibility
- Custom data visualization

## Theme Customization

### Method 1: CSS Variables

```css
/* globals.css */
:root {
  --color-primary-600: #your-brand-color;
  --font-sans: 'Your Font', sans-serif;
}
```

### Method 2: Tailwind Config

```javascript
// tailwind.config.js
module.exports = {
  presets: [designTokens],
  theme: {
    extend: {
      colors: {
        primary: {
          600: '#your-color',
        },
      },
    },
  },
};
```

### Method 3: Component Override

```typescript
<ReviewsList 
  listingId="123"
  className="[&_.review-card]:bg-custom-color"
/>
```

## Component Variants

Most components support variants:

```typescript
// Reviews
<ReviewsList variant="default" />  // Full featured
<ReviewsList variant="compact" />   // Condensed
<ReviewsList variant="featured" />  // Highlighted

// Forms
<ReviewForm variant="default" />    // Full form
<ReviewForm variant="compact" />     // Minimal form
```

## Turborepo Integration

### Monorepo Structure

```
your-platform/
├── apps/
│   └── web/                 # Your Next.js app
├── packages/
│   ├── @listing-platform/
│   │   ├── reviews/
│   │   ├── maps/
│   │   └── booking/
│   └── your-custom/
└── turbo.json
```

### turbo.json

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false
    }
  }
}
```

### Benefits

- **Hot Reload**: Changes in SDKs reflect immediately
- **Type Safety**: TypeScript types flow between packages
- **Shared Code**: Share utilities across packages
- **Fast Builds**: Turborepo caches and parallelizes

## Best Practices

### 1. Start Simple

Begin with Level 1 (as-is), then customize as needed.

### 2. Use Design Tokens

Always use design tokens for consistency:
- Colors: `text-primary-600` not `text-[#0ea5e9]`
- Spacing: `p-4` not `p-[16px]`
- Typography: `text-lg` not `text-[18px]`

### 3. Override Strategically

- Use CSS variables for global theme changes
- Use Tailwind config for design token extensions
- Use className for component-specific overrides

### 4. Performance

- Import only what you need
- Use dynamic imports for heavy components
- Leverage Next.js Image for photos

### 5. Accessibility

- Headless components include ARIA attributes
- Styled components follow accessibility best practices
- Test with screen readers

## Examples

See `examples/frontend/` for complete examples:
- `customization-levels.tsx` - All 4 levels
- `theme-override.tsx` - Theme customization

## Troubleshooting

### Components Not Styled

**Problem**: Components appear unstyled

**Solution**:
1. Check Tailwind config includes SDK paths
2. Verify design tokens CSS is imported
3. Ensure Tailwind is processing SDK files

### Type Errors

**Problem**: TypeScript errors with SDK imports

**Solution**:
1. Install `@types/react` and `@types/react-dom`
2. Check package.json has correct peer dependencies
3. Restart TypeScript server

### Build Errors

**Problem**: Build fails with SDK imports

**Solution**:
1. Ensure all dependencies are installed
2. Check package.json exports are correct
3. Verify Turborepo pipeline configuration

## Next Steps

1. Review [examples](../examples/frontend/)
2. Set up your Tailwind config
3. Install SDK packages
4. Start building!

