# @listing-platform/design-tokens

Design tokens for the listing platform ecosystem. Provides colors, typography, spacing, shadows, and other design constants.

## Installation

```bash
pnpm add @listing-platform/design-tokens
```

## Usage

### TypeScript/JavaScript

```typescript
import { tokens } from '@listing-platform/design-tokens';

// Access tokens
const primaryColor = tokens.colors.primary[600];
const fontSize = tokens.typography.fontSize.lg;
const spacing = tokens.spacing[4];
```

### Tailwind CSS

Use as a preset in your `tailwind.config.js`:

```javascript
const designTokens = require('@listing-platform/design-tokens/tailwind.config');

module.exports = {
  presets: [designTokens],
  // Your custom config...
};
```

### CSS Variables

Import the CSS file in your app:

```typescript
// app/layout.tsx or globals.css
import '@listing-platform/design-tokens/styles/tokens.css';
```

Then use in your CSS:

```css
.my-component {
  color: var(--color-primary-600);
  font-size: var(--font-size-lg);
  padding: var(--spacing-4);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}
```

## Available Tokens

### Colors

- `primary` - Primary brand color (blue scale)
- `secondary` - Secondary brand color (purple scale)
- `neutral` - Neutral grays
- `success` - Success states (green)
- `warning` - Warning states (yellow)
- `error` - Error states (red)
- `info` - Info states (blue)

Each color has scales from 50 (lightest) to 950 (darkest).

### Typography

- `fontFamily` - Font families (sans, serif, mono)
- `fontSize` - Font sizes (xs to 9xl)
- `fontWeight` - Font weights (thin to black)
- `lineHeight` - Line heights
- `letterSpacing` - Letter spacing

### Spacing

Scale from 0 to 96 (0 to 24rem / 384px)

### Border Radius

- `none`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `full`

### Shadows

- `sm`, `md`, `lg`, `xl`, `2xl`, `inner`, `none`

### Breakpoints

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Z-Index

Predefined z-index values for common UI layers.

## Overriding Tokens

### CSS Variables

Override in your CSS:

```css
:root {
  --color-primary-600: #your-brand-color;
  --font-sans: 'Your Custom Font', sans-serif;
}
```

### Tailwind Config

Extend in your Tailwind config:

```javascript
module.exports = {
  presets: [designTokens],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#your-color',
        },
      },
    },
  },
};
```

## License

MIT

