# Builder.io Dev Mode - No Build Required

## Important Discovery

The build fails due to internal path aliases in `@tinadmin/core`, but **Builder.io only needs dev mode**, not a production build!

## Solution: Use Dev Mode Only

For Builder.io, use this dev command (no build needed):

```bash
cd apps/portal && pnpm dev
```

**Why this works:**
- Dev mode doesn't require a full build
- Next.js compiles on-demand in dev mode
- Builder.io connects to the dev server, not a production build
- The build errors don't affect dev mode

## What We Fixed

1. ✅ **expandNextJsTemplate error** - Fixed by disabling `optimizePackageImports`
2. ✅ **Import paths** - Fixed booking route imports
3. ✅ **Dev server binding** - Added `--hostname 0.0.0.0`

## Build Errors (Not Critical for Builder.io)

The build errors are related to:
- Internal path aliases in `@tinadmin/core` (`@/core/...`)
- These need to be resolved for production builds
- But they don't affect dev mode

## Recommended Dev Command for Builder.io

**Use this:**

```bash
cd apps/portal && pnpm dev
```

**Dev Server URL:**
```
http://localhost:3030
```

## Why No Pre-Build?

- Builder.io needs **dev mode** for hot reloading
- Production builds don't support hot reload
- Dev mode compiles on-demand, avoiding build issues
- The `fallback-build-manifest.json` is created during first request in dev mode

## Next Steps

1. Use `cd apps/portal && pnpm dev` in Builder.io
2. Wait for "Ready" message
3. Builder.io should connect successfully
4. Fix production build separately (not needed for Builder.io)

