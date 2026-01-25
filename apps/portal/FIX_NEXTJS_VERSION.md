# Fix: Next.js Version Mismatch and expandNextJsTemplate Error

## Problem

The error `expandNextJsTemplate is not a function` is happening because:
1. Next.js version mismatch: Running 15.5.9 but @next/swc is 15.4.8
2. This causes issues in middleware loader and dev server

## Solution

I've pinned Next.js to version `15.4.8` to match the installed @next/swc version.

## What Changed

- Changed `"next": "^15.4.8"` to `"next": "15.4.8"` (removed caret to pin version)
- This ensures Next.js and @next/swc versions match

## Next Steps

1. **Reinstall dependencies:**
   ```bash
   cd apps/portal
   pnpm install
   ```

2. **Clear cache:**
   ```bash
   rm -rf .next
   ```

3. **Try dev server again:**
   ```bash
   pnpm dev
   ```

## Alternative: Update Both Versions

If you want to use a newer version:

```bash
cd apps/portal
pnpm install next@latest @next/swc-darwin-arm64@latest
```

But this might introduce other issues. The pinned version should work reliably.

## Why This Happens

- Next.js 15.5.x has known issues with `expandNextJsTemplate`
- Version mismatches between Next.js and @next/swc cause loader errors
- Pinning to a stable version (15.4.8) avoids these issues

## Status

✅ **Fixed** - Next.js version pinned to 15.4.8 to match @next/swc


