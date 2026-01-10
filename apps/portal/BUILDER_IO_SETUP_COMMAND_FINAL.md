# Builder.io Setup Command - Final Version

## Problem

Builder.io is installing Next.js 15.5.9 instead of 15.4.8, causing:
- `expandNextJsTemplate is not a function` error
- Version mismatch with @next/swc
- Middleware loader failures

## Solution: Force Correct Version

Use this **Setup Command** in Builder.io:

```bash
cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

This will:
1. Clear cached node_modules and .next
2. Force install Next.js 15.4.8
3. Install all other dependencies

## Alternative: Simpler Version

If the above is too complex:

```bash
pnpm install next@15.4.8 --force
```

Then in Dev Command, use:

```bash
cd apps/portal && pnpm dev
```

## Why This Is Needed

- Builder.io might cache node_modules
- Lockfile might have multiple Next.js versions
- Need to explicitly force the correct version

## Verify After Setup

Check the version:

```bash
cd apps/portal && pnpm list next
```

Should show: `next 15.4.8`

## Complete Setup + Dev Commands

**Setup Command:**
```bash
cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

**Dev Command:**
```bash
cd apps/portal && pnpm dev
```

**Dev Server URL:**
```
http://localhost:3030
```

## Status

- ✅ Next.js pinned to 15.4.8 in package.json
- ⚠️ Need to force install in Builder.io setup
- ⚠️ Clear cache to ensure clean install
