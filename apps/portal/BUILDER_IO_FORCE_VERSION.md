# Force Builder.io to Use Next.js 15.4.8

## Problem

Builder.io is still using Next.js 15.5.9 despite pinning to 15.4.8. This causes:
- Version mismatch with @next/swc
- `expandNextJsTemplate is not a function` error
- Middleware loader failures

## Solution: Force Version in Setup Command

Update Builder.io's **Setup Command** to explicitly install the correct version:

```bash
pnpm install next@15.4.8 @next/swc-darwin-arm64@15.4.8 --force
```

Or for a complete clean install:

```bash
rm -rf node_modules .next && pnpm install next@15.4.8 @next/swc-darwin-arm64@15.4.8 && pnpm install
```

## Why This Happens

Builder.io might:
1. Have cached node_modules
2. Not be reading the lockfile correctly
3. Auto-updating Next.js despite the pin

## Recommended Setup Command

**Use this in Builder.io:**

```bash
cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 && pnpm install
```

This will:
1. Clear cached dependencies
2. Install Next.js 15.4.8 explicitly
3. Install all other dependencies from lockfile

## Alternative: Update Lockfile

If the above doesn't work, regenerate the lockfile:

```bash
cd apps/portal && pnpm install --no-frozen-lockfile
```

But this might update other packages unexpectedly.

## Verify Version

After setup, verify the version:

```bash
cd apps/portal && pnpm list next
```

Should show: `next 15.4.8`

## Status

- ✅ Next.js pinned to 15.4.8 in package.json
- ✅ Lockfile updated
- ⚠️ Builder.io needs to reinstall with explicit version
- ⚠️ May need to clear node_modules cache


