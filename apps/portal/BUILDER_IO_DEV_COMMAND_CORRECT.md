# Builder.io Dev Command - Correct Path

## Problem

Builder.io shows:
```
cd: no such file or directory: apps/portal
Error: listen EADDRINUSE: address already in use 0.0.0.0:3030
```

## Issues

1. **Path Issue:** `cd apps/portal` fails because Builder.io runs from repository root
2. **Port Conflict:** Port 3030 is already in use

## Solution

### Fix 1: Use Absolute Path or Verify Root Directory

Builder.io runs from the repository root. The command should work, but let's verify:

**Dev Command (should work from root):**
```bash
cd apps/portal && pnpm dev
```

If that fails, try with explicit path:
```bash
cd /root/app/code/apps/portal && pnpm dev
```

Or use pnpm's `--filter` from root:
```bash
pnpm --filter @tinadmin/portal dev
```

### Fix 2: Kill Port 3030 First

Before running dev command, kill any existing process:

**Add to Setup Command (optional):**
```bash
npm install -g pnpm@10.6.1 && lsof -ti:3030 | xargs kill -9 2>/dev/null || true && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

**Or update Dev Command to kill port first:**
```bash
lsof -ti:3030 | xargs kill -9 2>/dev/null || true && cd apps/portal && pnpm dev
```

## Recommended Configuration

### Option 1: Kill Port in Dev Command (Recommended)

**Setup Command:**
```bash
npm install -g pnpm@10.6.1 && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

**Dev Command:**
```bash
lsof -ti:3030 | xargs kill -9 2>/dev/null || true && cd apps/portal && pnpm dev
```

**Dev Server URL:**
```
http://localhost:3030
```

### Option 2: Use pnpm Filter from Root

**Setup Command:**
```bash
npm install -g pnpm@10.6.1 && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

**Dev Command:**
```bash
lsof -ti:3030 | xargs kill -9 2>/dev/null || true && pnpm --filter @tinadmin/portal dev
```

**Dev Server URL:**
```
http://localhost:3030
```

### Option 3: Use Different Port

If port conflicts persist, use a different port:

**Update package.json:**
```json
{
  "scripts": {
    "dev": "next dev --port 3031 --hostname 0.0.0.0"
  }
}
```

**Dev Command:**
```bash
cd apps/portal && pnpm dev
```

**Dev Server URL:**
```
http://localhost:3031
```

## Why cd apps/portal Might Fail

Builder.io might be running from a different directory than expected. The error suggests:
- Builder.io is in `/root/app/code` (or similar)
- But `apps/portal` doesn't exist relative to that path

**Solution:** Use absolute path or verify Builder.io's working directory.

## Debugging

### Check Builder.io's Working Directory

In Builder.io Debugging Terminal, run:
```bash
pwd
ls -la
```

This will show where Builder.io is running from.

### Test Path

```bash
ls apps/portal/package.json
```

If this fails, Builder.io is not in the repository root.

## Best Solution

**Use the kill-port approach in Dev Command:**

**Dev Command:**
```bash
lsof -ti:3030 | xargs kill -9 2>/dev/null || true && cd apps/portal && pnpm dev
```

This will:
1. Kill any process on port 3030 (if exists)
2. Change to apps/portal directory
3. Start dev server

**Why this works:**
- ✅ Handles port conflicts automatically
- ✅ Works from repository root
- ✅ Safe (won't fail if port is free)

