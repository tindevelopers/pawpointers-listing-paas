# Fix: npm workspace:* Error in Builder.io

## Problem

npm doesn't support `workspace:*` protocol (that's pnpm/yarn only). Error:
```
npm error Unsupported URL Type "workspace:": workspace:*
```

## Solution: Install from Repository Root

Since Builder.io runs from repository root, install using npm workspaces from there:

### Setup Command

```bash
npm install next@15.4.8 --force && npm install
```

**Why this works:**
- Runs from repository root (where Builder.io executes)
- npm will resolve workspace dependencies automatically
- Installs Next.js 15.4.8 first, then all dependencies

### Alternative: Install pnpm First

If npm workspaces don't work, install pnpm first:

```bash
npm install -g pnpm@10.6.1 && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

## Recommended Setup Command

**Try this first (npm workspaces):**

```bash
npm install next@15.4.8 --force && npm install
```

**If that fails, use pnpm:**

```bash
npm install -g pnpm@10.6.1 && cd apps/portal && rm -rf node_modules .next && pnpm install next@15.4.8 --force && pnpm install
```

## Dev Command

**If using npm:**
```bash
cd apps/portal && npm run dev
```

**If using pnpm:**
```bash
cd apps/portal && pnpm dev
```

## Why This Happens

- `workspace:*` is pnpm/yarn syntax
- npm doesn't understand it
- Need to install from root where npm can resolve workspaces
- Or install pnpm first

## Status

- ⚠️ npm doesn't support workspace:*
- ✅ Install from repository root
- ✅ Or install pnpm first

