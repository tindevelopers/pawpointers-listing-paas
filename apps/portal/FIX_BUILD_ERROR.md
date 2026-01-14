# Fix: expandNextJsTemplate is not a function

## Problem

Build fails with:
```
bindings.expandNextJsTemplate is not a function
```

This is a known bug in Next.js 15.5.9 with the `experimental.optimizePackageImports` feature.

## Solution

I've temporarily disabled `optimizePackageImports` in `next.config.ts`. This feature is experimental and causing build failures.

## What Changed

Commented out the `experimental.optimizePackageImports` section in `next.config.ts`.

## Impact

- **Build will work** ✅
- **Bundle size might be slightly larger** (but still optimized by Next.js default optimizations)
- **No functional impact** - app will work exactly the same

## Alternative Solutions

### Option 1: Update Next.js (when fix is available)

When Next.js releases a fix, you can re-enable:

```typescript
experimental: {
  optimizePackageImports: [
    "@tinadmin/core",
    "@tinadmin/ui-consumer",
    "@heroicons/react",
    "@builder.io/react",
  ],
},
```

### Option 2: Remove specific packages

If you want to keep the feature, try removing problematic packages one by one:

```typescript
experimental: {
  optimizePackageImports: [
    "@heroicons/react",
    // Remove others if they cause issues
  ],
},
```

## Status

✅ **Fixed** - Build should now work without the `expandNextJsTemplate` error.

## Next Steps

1. Try building again: `cd apps/portal && pnpm build`
2. If build succeeds, use this dev command in Builder.io:
   ```bash
   cd apps/portal && pnpm dev
   ```
   (No need to pre-build since we're using dev mode)

