# Fix: Next.js Version Mismatch in Builder.io

## Problem

Builder.io is showing:
- Next.js 15.5.9 running
- @next/swc version mismatch (detected: 15.4.8 while Next.js is on 15.5.7)
- Error: `expandNextJsTemplate is not a function` in middleware loader

## Root Cause

This is a known bug in Next.js 15.5.x versions. The version mismatch between Next.js and @next/swc causes the middleware loader to fail.

## Solutions

### Solution 1: Pin Next.js Version (Already Done)

I've pinned Next.js to `15.4.8` in `package.json`. However, Builder.io might be using a cached version.

**Action needed:**
1. Make sure `pnpm-lock.yaml` is committed and pushed
2. Builder.io should reinstall dependencies to get the correct version

### Solution 2: Temporarily Disable Middleware (Quick Fix)

If middleware isn't critical for Builder.io visual editing, you can temporarily rename it:

```bash
mv apps/portal/middleware.ts apps/portal/middleware.ts.bak
```

Then restart the dev server. This will bypass the middleware loader error.

### Solution 3: Update Setup Command

Add version check to setup command in Builder.io:

```bash
cd apps/portal && pnpm install next@15.4.8 @next/swc-darwin-arm64@15.4.8 && pnpm install
```

### Solution 4: Wait for Next.js Fix

Next.js 15.5.x has known issues. Consider waiting for 15.6.x or using 15.4.8.

## Recommended Action

1. **Commit and push the lockfile:**
   ```bash
   git add pnpm-lock.yaml
   git commit -m "fix: pin Next.js to 15.4.8 to fix Builder.io compatibility"
   git push origin main
   ```

2. **In Builder.io, update Setup Command:**
   ```bash
   pnpm install
   ```

3. **Clear Builder.io cache** (if possible) or restart the project setup

## Why This Happens

- Next.js 15.5.x introduced a bug with `expandNextJsTemplate`
- Version mismatches between Next.js and @next/swc cause loader failures
- Builder.io's environment might have cached or auto-updated to 15.5.9

## Current Status

- ✅ Next.js pinned to 15.4.8 in package.json
- ⚠️ Need to ensure Builder.io uses this version
- ⚠️ Lockfile needs to be committed

## Next Steps

1. Commit the updated `package.json` and `pnpm-lock.yaml`
2. Push to main branch
3. In Builder.io, restart the setup process
4. Builder.io should now use Next.js 15.4.8

