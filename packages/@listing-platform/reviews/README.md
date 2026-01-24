# @listing-platform/reviews

> **⚠️ Deprecated:** This package is now a compatibility wrapper. Please use [`@listing-platform/reviews-sdk`](../reviews-sdk) instead.

This package re-exports everything from `@listing-platform/reviews-sdk` to maintain backward compatibility with existing code.

## Migration

Update your imports:

```typescript
// Old (still works)
import { ReviewsList } from '@listing-platform/reviews';

// New (recommended)
import { ReviewsList } from '@listing-platform/reviews-sdk';
```

All exports remain the same, so you can update imports gradually without changing component code.

## See Also

- [`@listing-platform/reviews-sdk`](../reviews-sdk) - The main SDK package
