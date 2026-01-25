# Builder.io Dev Command - Fixed for Build Manifest Error

## Problem

Builder.io is trying to access `.next/fallback-build-manifest.json` before Next.js finishes compiling, causing:

```
Error: ENOENT: no such file or directory, open '/root/app/code/apps/portal/.next/fallback-build-manifest.json'
```

## Solution

The dev server needs time to compile before Builder.io tries to access it. Use one of these approaches:

### Option 1: Pre-build Then Dev (Recommended for Builder.io)

This ensures all build artifacts exist before starting the dev server:

```bash
cd apps/portal && pnpm build && pnpm dev
```

**Pros:**
- All build files exist immediately
- No race conditions
- More reliable for Builder.io

**Cons:**
- Slower startup (builds first)
- No hot reload during initial build

### Option 2: Wait for Ready (Current Approach)

Keep the simple dev command but ensure Builder.io waits:

```bash
cd apps/portal && pnpm dev
```

**Important:** Builder.io must wait for the "Ready" message before trying to access pages.

**How to verify:**
1. Check the "Debugging Terminal" in Builder.io
2. Look for: `✓ Ready in X.Xs`
3. Only then should Builder.io try to connect

### Option 3: Quick Build Script

Create a script that does a quick build check:

```bash
cd apps/portal && (test -f .next/fallback-build-manifest.json || pnpm build) && pnpm dev
```

## Recommended Dev Command for Builder.io

**Use this:**

```bash
cd apps/portal && pnpm build && pnpm dev
```

This ensures:
1. All build artifacts are created
2. `fallback-build-manifest.json` exists
3. Builder.io can connect immediately
4. Dev server starts with hot reload

## What Changed

I've also commented out `output: 'standalone'` in `next.config.ts` because:
- It's for production builds, not dev mode
- It might cause issues with dev server
- Builder.io needs dev mode, not production mode

## Verification

After Builder.io starts the dev server, verify the file exists:

```bash
ls -la apps/portal/.next/fallback-build-manifest.json
```

If it exists, Builder.io should be able to access it.

## Alternative: Production Mode (Not Recommended)

If dev mode keeps failing, you could use production mode:

```bash
cd apps/portal && pnpm build && pnpm start
```

But this loses hot reloading, which Builder.io needs for visual editing.


