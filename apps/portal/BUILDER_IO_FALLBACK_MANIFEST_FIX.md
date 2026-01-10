# Fix: fallback-build-manifest.json ENOENT Error

## Problem

Builder.io is trying to access `.next/fallback-build-manifest.json` before Next.js has compiled it. The dev server is running, but Next.js hasn't created the build manifest file yet.

## Root Cause

In dev mode, Next.js creates `fallback-build-manifest.json` during the first compilation. Builder.io is trying to access it before that happens.

## Solutions

### Solution 1: Trigger Compilation on Startup (Recommended)

Modify the dev command to trigger a compilation immediately:

```bash
cd apps/portal && pnpm dev & sleep 5 && curl -s http://localhost:3030 > /dev/null && wait
```

This:
1. Starts dev server in background
2. Waits 5 seconds for it to start
3. Makes a request to trigger compilation
4. Waits for the server to keep running

### Solution 2: Use a Startup Script

Create a script that waits for readiness:

```bash
cd apps/portal && ./wait-for-dev.sh
```

### Solution 3: Pre-compile Before Dev (Slower but Reliable)

If the above don't work, you can do a quick build first:

```bash
cd apps/portal && pnpm next build --debug && pnpm dev
```

**Note:** This is slower but ensures all files exist.

### Solution 4: Wait for Ready Message

Builder.io should wait for the "Ready" message in the terminal before trying to connect. Check the Debugging Terminal for:
```
✓ Ready in X.Xs
```

## Recommended Dev Command

Try this first:

```bash
cd apps/portal && pnpm dev & sleep 10 && curl http://localhost:3030 > /dev/null 2>&1 && wait
```

Or simpler (if Builder.io can wait):

```bash
cd apps/portal && timeout 300 pnpm dev || true
```

## Why This Happens

- Next.js dev mode compiles on-demand
- `fallback-build-manifest.json` is created during first compilation
- Builder.io tries to access it before compilation completes
- The dev server is running but not fully ready

## Verification

After the dev server starts, check if the file exists:

```bash
ls -la apps/portal/.next/fallback-build-manifest.json
```

If it exists, Builder.io should be able to connect.

## Alternative: Use Production Mode

If dev mode keeps having issues:

```bash
cd apps/portal && pnpm build && pnpm start
```

But this loses hot reloading, which Builder.io needs for visual editing.

