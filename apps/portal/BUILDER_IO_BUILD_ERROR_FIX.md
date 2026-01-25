# Fix Builder.io Build Manifest Error

## Problem

Builder.io is trying to access `.next/fallback-build-manifest.json` before Next.js has finished compiling:

```
Error: ENOENT: no such file or directory, open '/root/app/code/apps/portal/.next/fallback-build-manifest.json'
```

## Cause

This happens when Builder.io tries to connect to the dev server before Next.js has completed its initial compilation. The `.next` directory and build artifacts are created during the first compilation.

## Solutions

### Solution 1: Pre-build Before Dev (Recommended)

Add a build step before starting the dev server. Update your dev command in Builder.io:

```bash
cd apps/portal && pnpm build && pnpm dev
```

**Note:** This will take longer but ensures all build artifacts exist.

### Solution 2: Wait for Dev Server to Be Ready

The dev server needs time to compile. Builder.io should wait for the "Ready" message. Make sure:

1. The dev command is actually starting the server
2. Builder.io waits for compilation to complete
3. Check the "Debugging Terminal" in Builder.io for the "Ready" message

### Solution 3: Use Standalone Output (Current Config)

Your `next.config.ts` already has `output: 'standalone'`. This is good, but you might need to ensure the build completes first.

### Solution 4: Create .next Directory Manually

As a workaround, you can create the directory structure:

```bash
cd apps/portal && mkdir -p .next && pnpm dev
```

But this won't create the manifest file - Next.js needs to compile first.

## Recommended Fix

**Option A: Pre-build (slower but reliable)**

In Builder.io Dev Command:
```bash
cd apps/portal && pnpm build && pnpm dev
```

**Option B: Let dev server compile (faster)**

Keep current command but ensure Builder.io waits:
```bash
cd apps/portal && pnpm dev
```

Then in Builder.io:
- Wait for "Ready" message in Debugging Terminal
- Don't try to access pages until compilation completes
- Check that the dev server is actually running

## Why This Happens

Next.js creates build artifacts during compilation:
- First request triggers compilation
- `.next` directory is created
- `fallback-build-manifest.json` is generated
- Builder.io might try to access it too early

## Verification

After the dev server starts, verify the file exists:

```bash
ls -la apps/portal/.next/fallback-build-manifest.json
```

If it exists, Builder.io should be able to access it.

## Alternative: Use Production Build

If dev mode keeps having issues, you could use:

```bash
cd apps/portal && pnpm build && pnpm start
```

But this won't have hot reloading.


